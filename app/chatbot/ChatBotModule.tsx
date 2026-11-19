import {DetectionRecord} from "@/database/tables/DetectionsTable"
import SpeechText from "@/src/SpeechText";
import { TtsVoices } from "@/src/TtsVoices";
import { markdownToSpeech } from "@/src/markdownToSpeech";
import { SpeechStreamer } from "@/src/SpeechStreamer";
import LlmServer, { LlmApiError, LlmStreamRequest, NewChatContext, summarizeDetections } from "@/src/LlmServer";
import { WifiBinder } from "@/src/WifiBinder";
import { LLM_HANDSHAKE_POLL_MS, LLM_MAX_MESSAGE_CHARS, LLM_SSID } from "@/constants/config";
import { useHeaderHeight } from "@react-navigation/elements";
import { LinearGradient } from "expo-linear-gradient";
import { File } from "expo-file-system";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Image, StyleSheet, Text, TextInput, View } from "react-native";
import { GiftedChat, IMessage, MessageImage, MessageText, Send } from "react-native-gifted-chat";
import { EnrichedMarkdownText, MarkdownStyle } from "react-native-enriched-markdown";
import { Button, IconButton, MD3Colors } from "react-native-paper";
import { useWindowDimensions } from "react-native";
import HowItWorksButton from "@/components/ui/how-it-works-button";
import { useModuleTour } from "@/hooks/useModuleTour";
import { TOUR_IDS } from "@/constants/tours/tourIds";
import { buildChatbotTourSteps } from "@/constants/tours/chatbot";

type ChatBotModuleProps = {
	detection?: DetectionRecord
	// Cambia con cada "Chatbot" pulsado en el Álbum (aunque sea la misma foto) para iniciar una conversación nueva
	attachKey?: string
}

type ConnectionState = "scanning" | "loading" | "connected" | "failed"

const USER = { _id: 1, name: "User" };
const BOT_USER = { _id: 2, name: "Chatbot" };

// Miniatura de la foto adjunta: se respeta la proporción real para que no se recorte
// (el visor ampliado de GiftedChat calcula su tamaño a partir de la miniatura).
const PHOTO_MAX_WIDTH = 220;
const PHOTO_MAX_HEIGHT = 300;
const DEFAULT_PHOTO_ASPECT = 3 / 4;

const photoThumbnailSize = (aspect: number) => {
	let width = PHOTO_MAX_WIDTH;
	let height = width / aspect;
	if (height > PHOTO_MAX_HEIGHT) {
		height = PHOTO_MAX_HEIGHT;
		width = height * aspect;
	}
	return { width, height };
};

const photoExists = (uri?: string): boolean => {
	if (!uri) return false;
	try {
		return new File(uri).exists;
	} catch (error) {
		console.warn("No se pudo leer la foto de la detección:", error);
		return false;
	}
};

const WELCOME_TEXT =
	"Bienvenido. ¿En qué puedo ayudarte?\n\n" +
	"_Diagnóstico orientativo generado por IA. Confirme con un agrónomo antes de aplicar tratamientos._";

const TYPING_TEXT = "Escribiendo…";
const MIC_PERMISSION_TEXT = "Para dictar, permita el acceso al micrófono cuando la app lo pida (o en Ajustes > Aplicaciones > permisos).";
const MIC_ERROR_TEXT = "No se pudo iniciar el dictado. Intente de nuevo.";

const BOT_MARKDOWN_STYLE: MarkdownStyle = {
	paragraph: { fontSize: 16, color: "#000000", marginTop: 0, marginBottom: 6 },
	list: { fontSize: 16, color: "#000000", marginBottom: 6 },
	strong: { color: "#000000" },
};

// GiftedChat ordena los mensajes del más nuevo al más viejo.
const initialMessages = (detection?: DetectionRecord): IMessage[] => {
	const messages: IMessage[] = [
		{
			_id: "welcome",
			text: WELCOME_TEXT,
			createdAt: new Date(),
			user: BOT_USER,
		},
	];
	if (!detection) return messages;
	if (photoExists(detection.photo_dir)) {
		// Solo visual: la foto se envía al asistente junto con la primera pregunta (/new_chat).
		messages.unshift({
			_id: `photo-${detection.id}`,
			text: "Foto adjunta del Álbum. Escriba su pregunta para enviarla al asistente.",
			image: detection.photo_dir,
			createdAt: new Date(),
			user: USER,
		});
	} else {
		messages.unshift({
			_id: `photo-missing-${detection.id}`,
			text: "La foto de esta detección ya no está en el teléfono; usaré los resultados guardados de la detección.",
			createdAt: new Date(),
			user: BOT_USER,
		});
	}
	return messages;
};

export default function ChatBotModule (props: ChatBotModuleProps) {
	const llmServer = useMemo(() => new LlmServer(), []);
	const inputRef = useRef<TextInput>(null);
	const speechRef = useRef<SpeechText | null>(null);
	const [recording, setRecording] = useState(false);
	const isRecordingRef = useRef(false);
	// Texto del input controlado (GiftedChat `text`): el dictado lo escribe y GiftedChat lo limpia al enviar.
	const [composerText, setComposerText] = useState("");
	const inputHasContent = composerText.length > 0;
	// Evita enviar dos veces el mismo dictado (fin por silencio de Vosk y por el botón de micrófono).
	const dictationHandledRef = useRef(true);
	const sendDictationRef = useRef<(text: string) => void>(() => {});
	const headerHeight = useHeaderHeight();
	const windowSize = useWindowDimensions();
	const composerControlsRef = useRef<View | null>(null);
	const connectionRetryRef = useRef<View | null>(null);
	const { startModuleTour } = useModuleTour();

	const [connectionState, setConnectionState] = useState<ConnectionState>("scanning");
	const [connectionError, setConnectionError] = useState<string>("");
	const [streaming, setStreaming] = useState(false);
	const [messages, setMessages] = useState<IMessage[]>(() => initialMessages(props.detection));
	const [photoAspect, setPhotoAspect] = useState(DEFAULT_PHOTO_ASPECT);
	const photoImageStyle = useMemo(() => ({ ...photoThumbnailSize(photoAspect), borderRadius: 13, margin: 3 }), [photoAspect]);

	// chat_id de la conversación actual en el servidor (null => el próximo mensaje crea una con /new_chat)
	const chatIdRef = useRef<string | null>(null);
	// Respuesta en curso (para detenerla)
	const activeRequestRef = useRef<LlmStreamRequest | null>(null);
	// Si la foto falló en el servidor (415/413/502), la siguiente conversación usa la detección local
	const skipImageRef = useRef(false);
	// Invalida handshakes/polling anteriores (reintentos, cambio de foco)
	const handshakeSeqRef = useRef(0);
	const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	// Lectura en voz alta por oraciones de la respuesta en curso (preguntas dictadas)
	const speechStreamerRef = useRef<SpeechStreamer | null>(null);

	// Calla el TTS y evita que se encolen más oraciones de la respuesta que sigue llegando.
	const stopVoice = () => {
		speechStreamerRef.current?.cancel();
		speechStreamerRef.current = null;
		TtsVoices.stop();
	};

  const handleStartTour = () => {
		startModuleTour(TOUR_IDS.CHATBOT, () =>
			buildChatbotTourSteps({
				inputRef: inputRef as unknown as React.RefObject<any>,
				composerControlsRef,
				connectionRetryRef,
				connected: connectionState === "connected",
				connectionState,
				hasDetectionContext: props.detection !== undefined,
				windowSize: { width: windowSize.width, height: windowSize.height },
			}),
		);
	};

	const clearPoll = () => {
		if (pollTimerRef.current) {
			clearTimeout(pollTimerRef.current);
			pollTimerRef.current = null;
		}
	};

	// GET /handshake: valida que sea el asistente y espera mientras los modelos cargan.
	const handshake = useCallback(async () => {
		const seq = ++handshakeSeqRef.current;
		clearPoll();
		setConnectionState("scanning");
		// Android: el hotspot no tiene internet; forzar el tráfico por el Wi-Fi mientras el chat está abierto.
		await WifiBinder.bindToWifi();

		const attempt = async () => {
			if (seq !== handshakeSeqRef.current) return;
			try {
				const info = await llmServer.handshake();
				if (seq !== handshakeSeqRef.current) return;
				if (info.status === "ready") {
					setConnectionState("connected");
					return;
				}
				if (info.status === "loading") {
					setConnectionState("loading");
					pollTimerRef.current = setTimeout(attempt, LLM_HANDSHAKE_POLL_MS);
					return;
				}
				setConnectionError("El asistente no pudo cargar los modelos. El equipo reintenta solo cada 30 s; espere y presione Reintentar.");
				setConnectionState("failed");
			} catch (error) {
				if (seq !== handshakeSeqRef.current) return;
				console.error("Handshake fallido:", error);
				setConnectionError(
					error instanceof LlmApiError && error.code === "wrong_service"
						? "El dispositivo conectado no es el asistente agrónomo."
						: `No se encontró el asistente. Verifique que esté conectado al Wi-Fi ${LLM_SSID} y que el equipo esté encendido.`
				);
				setConnectionState("failed");
			}
		};
		await attempt();
	}, [llmServer]);

	// La pestaña queda montada al navegar: enlazar/liberar el Wi-Fi según el foco.
	useFocusEffect(useCallback(() => {
		handshake();
		return () => {
			handshakeSeqRef.current++;
			clearPoll();
			activeRequestRef.current?.abort();
			stopVoice();
			// Si se sale grabando, se descarta el dictado (no se envía fuera de la pantalla).
			if (isRecordingRef.current) {
				dictationHandledRef.current = true;
				isRecordingRef.current = false;
				speechRef.current?.stop();
				setRecording(false);
			}
			WifiBinder.unbind();
		};
	}, [handshake]));

	// Cada adjunto desde el Álbum => nueva conversación (/new_chat), mostrando la foto adjunta
	const resetKey = props.attachKey ?? (props.detection ? String(props.detection.id) : "");
	useEffect(()=>{
		activeRequestRef.current?.abort();
		stopVoice();
		chatIdRef.current = null;
		skipImageRef.current = false;
		setMessages(initialMessages(props.detection));
		setPhotoAspect(DEFAULT_PHOTO_ASPECT);
		const photoUri = props.detection?.photo_dir;
		if (photoUri && photoExists(photoUri)) {
			Image.getSize(
				photoUri,
				(width, height) => { if (width > 0 && height > 0) setPhotoAspect(width / height); },
				(error) => console.warn("No se pudo obtener el tamaño de la foto:", error),
			);
		}
	// Solo resetKey: app/(tabs)/chatbot.tsx crea props.detection con JSON.parse en cada render,
	// así que depender del objeto reiniciaría la conversación constantemente.
	// eslint-disable-next-line react-hooks/exhaustive-deps
	},[resetKey]);

	// Dictado (Vosk): los parciales se ven en el input; al terminar (el usuario deja de hablar) se envía solo.
	// SpeechText se crea una vez, por eso el envío pasa por una ref con el estado actual.
	useEffect(()=>{
		speechRef.current = new SpeechText((text)=>{
			if (dictationHandledRef.current) { return }
			setComposerText(text);
		}, (text)=>{
			isRecordingRef.current = false;
			setRecording(false);
			sendDictationRef.current(text);
		});
	},[]);

	// Contexto del primer mensaje: foto (YOLO en el servidor) > detección local > nada.
	const buildNewChatContext = (): NewChatContext => {
		const detection = props.detection;
		if (!detection) return {};
		if (!skipImageRef.current && photoExists(detection.photo_dir)) {
			return { imageUri: detection.photo_dir };
		}
		const summary = summarizeDetections(detection.detection);
		return { detectionData: summary.length > 0 ? summary : "Sin detecciones en la foto." };
	};

	const describeError = (error: unknown): string => {
		if (!(error instanceof LlmApiError)) {
			return "No se pudo obtener respuesta del asistente. Intente de nuevo.";
		}
		switch (error.code) {
			case "chat_not_found":
				chatIdRef.current = null;
				return "La conversación expiró o el asistente se reinició. Envíe su mensaje de nuevo para iniciar una conversación nueva.";
			case "busy":
				return "El asistente está respondiendo otra consulta. Intente de nuevo en unos segundos.";
			case "model_not_ready":
				handshake();
				return "El asistente aún está cargando los modelos. Espere unos segundos e intente de nuevo.";
			case "invalid_image":
			case "payload_too_large":
			case "detection_failed":
				skipImageRef.current = true;
				return `No se pudo analizar la foto (${error.message}). Envíe su mensaje de nuevo para continuar con la detección hecha en el teléfono.`;
			case "unreachable":
			case "timeout":
				return `${error.message} Verifique la conexión al Wi-Fi ${LLM_SSID} e intente de nuevo.`;
			default:
				return error.message || "No se pudo obtener respuesta del asistente. Intente de nuevo.";
		}
	};

	// La respuesta se lee en voz alta oración por oración mientras llega (preguntas escritas o dictadas).
	const handleSend = async (newMessages: IMessage[] = []) => {
		const userMessage = newMessages[0]?.text?.trim() ?? "";
		if (streaming || connectionState !== "connected" || !userMessage) { return }
		stopVoice();

		const botMessageId = `bot-${Date.now()}`;
		const updateBotMessage = (text: string, pending = false) => {
			setMessages((previousMessages) =>
				previousMessages.map((message) =>
					message._id === botMessageId ? { ...message, text, pending } : message
				)
			);
		};

		setMessages((previousMessages) =>
			GiftedChat.append(GiftedChat.append(previousMessages, newMessages), [
				{ _id: botMessageId, text: TYPING_TEXT, createdAt: new Date(), user: BOT_USER, pending: true },
			])
		);

		if (userMessage.length > LLM_MAX_MESSAGE_CHARS) {
			updateBotMessage(`El mensaje es demasiado largo (máximo ${LLM_MAX_MESSAGE_CHARS} caracteres).`);
			return;
		}

		setStreaming(true);
		let received = "";
		// Con una build nativa sin enqueue se conserva la lectura completa al final.
		const streamer = TtsVoices.canEnqueue() ? new SpeechStreamer() : null;
		speechStreamerRef.current = streamer;
		const handlers = {
			onChatId: (chatId: string) => { chatIdRef.current = chatId; },
			onToken: (text: string) => {
				received += text;
				updateBotMessage(received);
				streamer?.push(text);
			},
		};

		try {
			const request = chatIdRef.current
				? llmServer.chat(chatIdRef.current, userMessage, handlers)
				: llmServer.newChat(userMessage, buildNewChatContext(), handlers);
			activeRequestRef.current = request;
			const result = await request.promise;
			if (result.chatId) chatIdRef.current = result.chatId;

			if (result.finishReason === "cancelled") {
				streamer?.cancel();
				updateBotMessage(received ? `${received}\n\n_(respuesta detenida)_` : "_(respuesta detenida)_");
			} else if (result.finishReason === "error") {
				streamer?.cancel();
				const reason = result.error?.message ?? "Falló el asistente al generar la respuesta.";
				updateBotMessage(`${received ? `${received}\n\n` : ""}**Error:** ${reason} Puede intentar de nuevo.`);
			} else {
				updateBotMessage(received || "_(respuesta vacía)_");
				if (streamer) {
					streamer.finish();
				} else {
					const speech = markdownToSpeech(received);
					if (speech) {
						TtsVoices.speak(speech);
					}
				}
			}
		} catch (error) {
			console.error("Error al conversar con el asistente:", error);
			streamer?.cancel();
			const reason = describeError(error);
			updateBotMessage(`${received ? `${received}\n\n` : ""}**Error:** ${reason}`);
		} finally {
			activeRequestRef.current = null;
			if (speechStreamerRef.current === streamer) {
				speechStreamerRef.current = null;
			}
			setStreaming(false);
		}
	};

	// POST /stop_response; si aún no hay chat_id (primer evento no llegó), cerrar la conexión.
	const handleStop = async () => {
		stopVoice();
		const request = activeRequestRef.current;
		if (!request) { return }
		const chatId = chatIdRef.current;
		if (!chatId) {
			request.abort();
			return;
		}
		try {
			await llmServer.stopResponse(chatId);
		} catch (error) {
			console.warn("stop_response falló, cerrando la conexión:", error);
			request.abort();
		}
	};

	// Fin del dictado: se envía solo si se puede; si hay una respuesta en curso o no hay conexión,
	// el texto queda en el input para enviarlo a mano.
	const sendDictation = (rawText: string) => {
		if (dictationHandledRef.current) { return }
		dictationHandledRef.current = true;
		const text = rawText.trim();
		if (!text) {
			setComposerText("");
			return;
		}
		if (streaming || connectionState !== "connected") {
			setComposerText(text);
			return;
		}
		setComposerText("");
		handleSend([{ _id: `dictation-${Date.now()}`, text, createdAt: new Date(), user: USER }]);
	};
	useEffect(()=>{
		sendDictationRef.current = sendDictation;
	});

	const microphoneButtonLogic = ()=>{
		if(!recording){
			// Cortar la voz para que el micrófono no la capte
			stopVoice();
			dictationHandledRef.current = false;
			setComposerText("");
			isRecordingRef.current = true;
			setRecording(true);
			speechRef.current?.record().catch((error) => {
				// Permiso de micrófono negado (o Vosk no pudo arrancar): volver al estado normal y avisar.
				console.warn("No se pudo iniciar el dictado:", error);
				dictationHandledRef.current = true;
				isRecordingRef.current = false;
				setRecording(false);
				setMessages((previousMessages) => GiftedChat.append(previousMessages, [{
					_id: `mic-error-${Date.now()}`,
					text: String(error).toLowerCase().includes("permission") ? MIC_PERMISSION_TEXT : MIC_ERROR_TEXT,
					createdAt: new Date(),
					user: BOT_USER,
				}]));
			});
		}else{
			const text = speechRef.current?.stop() ?? "";
			isRecordingRef.current = false;
			setRecording(false);
			sendDictation(text);
		}
	}

	return (
		<View style={{width:"100%", height:"100%"}}>
			<View style={{position:"absolute", top: 8, right: 4, zIndex: 30}}>
				<HowItWorksButton onPress={handleStartTour} />
			</View>
			<View style={{position:"absolute", width:"100%", height:"100%"}}>
        <LinearGradient
          colors={['#ffffff','#ffeedf',  '#793d09']}
          style={{ flex: 1 }}
          locations={[0,  0.94, 1]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
      </View>
			<GiftedChat
				textInputRef={inputRef as React.RefObject<TextInput>}
				// Evita que el teclado cubra el input, ajustando su posición según la altura del header de navegación
				keyboardAvoidingViewProps={{ keyboardVerticalOffset: headerHeight }}
				colorScheme="light"
				messages={messages}
				renderMessageText={(textProps)=>{
					const message = textProps.currentMessage;
					if (message && message.user._id === BOT_USER._id) {
						if (message.pending) {
							return <Text style={styles.typingText}>{message.text}</Text>;
						}
						// Las respuestas del asistente pueden traer Markdown (negritas, listas)
						return (
							<EnrichedMarkdownText
								markdown={message.text}
								flavor="commonmark"
								markdownStyle={BOT_MARKDOWN_STYLE}
								containerStyle={styles.botMarkdown}
								selectable
							/>
						);
					}
					return <MessageText {...textProps} textStyle={{left:{fontSize:16}, right:{fontSize:16}}}/>;
				}}
				renderMessageImage={(imageProps)=>(
					<MessageImage {...imageProps} imageStyle={photoImageStyle}/>
				)}
				onSend={(newMessages)=>handleSend(newMessages)}
				user={USER}
				text={composerText}
				textInputProps={{
					style:{fontSize:17, color:"black", marginBottom:4},
					maxLength: LLM_MAX_MESSAGE_CHARS,
					onChangeText:setComposerText,
					placeholder:"Escriba su mensaje aquí..."
				}}

				renderSend={ (sendProps)=>(
					<View ref={composerControlsRef} collapsable={false} style={{display:"flex", flexDirection:"row", alignItems:"center"}}>
						{streaming &&
							<IconButton
								size={32}
								icon="stop"
								mode="outlined"
								accessibilityLabel="Detener respuesta"
								iconColor={MD3Colors.error50}
								style={{ margin: 3, borderColor: MD3Colors.error50, borderWidth:2 }}
								onPress={handleStop}
							/>
						}

						{inputHasContent && !recording && !streaming && connectionState === "connected" &&
							<Send {...sendProps} label="Enviar">
								<IconButton
								size={32}
								icon="send"
								mode="outlined"
								iconColor={"#2ca4ff"}
								style={{ margin: 3, borderColor:"#2ca4ff", borderWidth:2 }}
								/>
							</Send>
						}

						{
							(!inputHasContent || recording) &&
								<IconButton
									size={32}
									icon="microphone"
									mode="outlined"
									style={{ margin: 3, borderColor:(recording?MD3Colors.error50: MD3Colors.neutral50), borderWidth:2 }}
									iconColor={recording?MD3Colors.error50: MD3Colors.neutral50}
									onPress={microphoneButtonLogic}/>
						}
					</View>
				)}
			/>

			{connectionState !== "connected" &&
				<View style={styles.connectionOverlay}>
					{connectionState === "scanning" || connectionState === "loading" ? (
						<>
							<ActivityIndicator size="large" color="#793d09"/>
							<Text style={styles.overlayText}>
								{connectionState === "scanning"
									? "Buscando el asistente..."
									: "El asistente está cargando los modelos. Esto tarda unos 30 segundos tras encender el equipo..."}
							</Text>
						</>
					):(
						<>
							<Text style={styles.overlayText}>{connectionError}</Text>
							<View ref={connectionRetryRef} collapsable={false}>
								<Button mode="contained-tonal" icon="refresh" onPress={handshake}>
									Reintentar
								</Button>
							</View>
						</>
					)}
				</View>
			}
		</View>
	);
};

const styles = StyleSheet.create({
	connectionOverlay: {
		position: "absolute",
		width: "100%",
		height: "100%",
		backgroundColor: "rgba(0,0,0,0.75)",
		display: "flex",
		justifyContent: "center",
		alignItems: "center",
		gap: 10,
		padding: 30,
	},
	overlayText: {
		color: "white",
		textAlign: "center",
	},
	typingText: {
		fontSize: 16,
		fontStyle: "italic",
		color: "#555555",
		marginHorizontal: 10,
		marginVertical: 5,
	},
	botMarkdown: {
		marginHorizontal: 10,
		marginTop: 5,
	},
});
