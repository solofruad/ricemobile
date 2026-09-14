import {DetectionRecord} from "@/database/tables/DetectionsTable"
import SpeechText from "@/src/SpeechText";
import { TtsVoices } from "@/src/TtsVoices";
import LlmServer from "@/src/LlmServer";
import { useHeaderHeight } from "@react-navigation/elements";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from "react-native";
import { GiftedChat, IMessage,  MessageText, Send } from "react-native-gifted-chat";
import { Button, IconButton, MD3Colors } from "react-native-paper";

type ChatBotModuleProps = {
	detection?: DetectionRecord
}

type ConnectionState = "scanning" | "connected" | "failed"

export default function ChatBotModule (props: ChatBotModuleProps) {
	const llmServer = useMemo(() => new LlmServer(), []);
	const inputRef = useRef<TextInput>(null);
	const [speechDetect, setSpeechDetect] = useState<SpeechText|null>(null);
	const [recording, setRecording] = useState(false);
	const [inputHasContent, setInputHasContent] = useState(false);
	const headerHeight = useHeaderHeight();
	const [connectionState, setConnectionState] = useState<ConnectionState>("scanning");
	const [pendingResponse, setPendingResponse] = useState(false);
	const contextSentRef = useRef(false);
	const [messages, setMessages] = useState([
		{
			_id: 1,
			text: "Bienvenido. ¿En qué puedo ayudarte?",
			createdAt: new Date(),
			user: { _id: 2, name: "Chatbot" },
		},
	]);

	const handshake = ()=>{
		setConnectionState("scanning");
		llmServer.handshake()
			.then(()=>{
				setConnectionState("connected");
				contextSentRef.current = false;
			})
			.catch((error)=>{
				console.error("Handshake fallido:", error);
				setConnectionState("failed");
			});
	}

	useEffect(()=>{
		handshake();
	},[]);

	useEffect(()=>{
		setSpeechDetect(
			new SpeechText((text)=>{
				inputRef.current?.setNativeProps({ text });
			}, (text)=>{
				if (!inputRef.current) { return }
				setRecording(false);
				inputRef.current.setNativeProps({ text });
				TtsVoices.speak(text);
			})
		);
	},[]);
	
	useEffect(()=>{
		if(props.detection)
			console.log("Received detection data in ChatBotModule:", props.detection);
	},[props.detection]);

	const handleSend = async (newMessages:Array<IMessage> = []) => {
		if(pendingResponse || connectionState !== "connected"){ return }

		setMessages((previousMessages) =>
			GiftedChat.append(previousMessages, newMessages as any)
		);

		const userMessage = newMessages[0].text;
		//La detección recibida desde el Album se envía como contexto solo en el primer mensaje de la conversación
		const hasContext = props.detection !== undefined && !contextSentRef.current;
		contextSentRef.current = true;
		const context = hasContext ? props.detection!.detection : undefined;
		setPendingResponse(true);
		let botResponse: string;
		try{
			botResponse = await llmServer.sendMessage(userMessage, context);
		}catch(error){
			console.error("Error al conversar con el servidor LLM:", error);
			botResponse = "No se pudo obtener respuesta del servidor de LLM. Intenta de nuevo.";
		}finally{
			setPendingResponse(false);
		}

		setMessages((previousMessages) =>
			GiftedChat.append(previousMessages, [
				{
					_id: Math.round(Math.random() * 1000000), // ?
					text: botResponse,
					createdAt: new Date(),
					user: { _id: 2, name: "Chatbot" },
				},
			])
		);
	};

	const microphoneButtonLogic = ()=>{
		if (inputRef.current) {
			if(!recording){
				inputRef.current.setNativeProps({ text:"" });
				speechDetect?.record();
			}else{
				const text = speechDetect?.stop() ?? "";
				if(!text){
					setInputHasContent(false);
				}
				inputRef.current.setNativeProps({ text });
				TtsVoices.speak(text);
			}
		}
		setRecording(!recording);
	}

	return (
		<View style={{width:"100%", height:"100%"}}>
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
				renderMessageText={(props)=>(
					<MessageText {...props} textStyle={{left:{fontSize:16}, right:{fontSize:16}}}/>
				)}
				onSend={handleSend}
				user={{ _id: 1, name: "User" }}
				textInputProps={{
					style:{fontSize:17, color:"black", marginBottom:4}, 
					onChangeText:((inputText)=>{
						setInputHasContent(inputText.length != 0)
					}),
					placeholder:"Escriba su mensaje aquí..."
				}}
				
				renderSend={ (sendProps)=>(
					<View style={{display:"flex", flexDirection:"row", alignItems:"center"}}>
						{inputHasContent && !recording && !pendingResponse && connectionState === "connected" &&
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
					{connectionState === "scanning" ? (
						<>
							<ActivityIndicator size="large" color="#793d09"/>
							<Text style={styles.overlayText}>Buscando servidor de LLM...</Text>
						</>
					):(
						<>
							<Text style={styles.overlayText}>No se encontró el servidor de LLM</Text>
							<Text style={styles.overlayText}>Verifique que esté conectado al hotspot del dispositivo e intente de nuevo.</Text>
							<Button mode="contained-tonal" icon="refresh" onPress={handshake}>
								Reintentar
							</Button>
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
});
