import {DetectionRecord} from "@/database/tables/DetectionsTable"
import SpeechText from "@/src/SpeechText";
import { TtsVoices } from "@/src/TtsVoices";
import { useHeaderHeight } from "@react-navigation/elements";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { TextInput, View } from "react-native";
import { GiftedChat, IMessage,  MessageText, Send } from "react-native-gifted-chat";
import { IconButton, MD3Colors } from "react-native-paper";
import Bot from "./Bot";

type ChatBotModuleProps = {
	detection?: DetectionRecord
}

export default function ChatBotModule (props: ChatBotModuleProps) {
	const bot = useMemo(() => new Bot(), []);
	const inputRef = useRef<TextInput>(null);
	const [speechDetect, setSpeechDetect] = useState<SpeechText|null>(null);
	const [recording, setRecording] = useState(false);
	const [inputHasContent, setInputHasContent] = useState(false);
	const headerHeight = useHeaderHeight();

	const [messages, setMessages] = useState([
		{
			_id: 1,
			text: bot.hello(),
			createdAt: new Date(),
			user: { _id: 2, name: "Chatbot" },
		},
	]);

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

	const handleSend = (newMessages:Array<IMessage> = []) => {
		setMessages((previousMessages) =>
			GiftedChat.append(previousMessages, newMessages as any)
		);

		const userMessage = newMessages[0].text;
		const botResponse = generateChatbotResponse(userMessage);

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

	const generateChatbotResponse = (userMessage: string) => {
		return bot.responseLogic(userMessage);
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
						{inputHasContent && !recording &&
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
		</View>
	);
};
