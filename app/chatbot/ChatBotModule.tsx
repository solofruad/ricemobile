import { DetectionRecord } from "@/database/db";
import SpeechText from "@/src/SpeechText";
import { TtsVoices } from "@/src/TtsVoices";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { TextInput, View } from "react-native";
import { GiftedChat, IMessage } from "react-native-gifted-chat";
import { Button, IconButton, MD3Colors, MD3DarkTheme } from "react-native-paper";

type Dialog = {
	text:string,
	options: Array<Option>
};
type Option = {
	text:string,
	next:string
}

const byDefault =  { //El array de opciones posibles de la anterior respuesta debe de permanecer activo
	text:"No te he entendido. Por favor, envia denuevo tu respuesta y procura que esté dentro de las respuestas posibles.",
};

const hello:Dialog = {
	text:"Bienvenido",
	options:[
		{text:"1 - Ver mapa", next:"map"}
	]
}

const map:Dialog = {
	text:"Ahora mismo ves el mapa",
	options:[
		{text:"1 - Ver Colombia", next:"colombia"}
	]
}


const botResponses: {[key:string]:Dialog} = {
	hello,
	map,
}

class Bot {
	lastResponse:Dialog = hello; //El bot siempre iniciará la conversación con el mensaje de bienvenida
	route: Array<string> = ["hello"]; //Pila de respuestas del bot (Excluyendo byDefault)

	responseLogic(userMessage:string){
		userMessage = userMessage.toLowerCase();
		let option:number;
		if(!isNaN(option = parseInt(userMessage))){
			console.log(this.route);
			if(this.lastResponse.options && option > 0 && option <= this.lastResponse.options.length){
				const nextResponseId = this.lastResponse.options[option-1].next;
				console.log(nextResponseId);
				this.route.push(nextResponseId);
				const botResponse = botResponses[nextResponseId];
				//TODO: botResponse is undefined warn
				this.lastResponse = botResponse;
				return this.response(botResponse);
			}
			if(option == -1 && this.route.length > 1){
				this.route.pop();
				const botResponse = botResponses[this.route.at(-1) as string];
				this.lastResponse = botResponse;
				return this.response(botResponse);
			}
		}
		return this.response(byDefault,true);
	}

	response(dialog:{text:string, options?:Array<Option>}, isDefault = false){
		let botMessage = dialog.text;
		if(dialog.options){
			botMessage += "\n"+ dialog.options.map(option => option.text).join("\n");
		}
		if(this.route.length > 1 && !isDefault){
			botMessage += "\n\n -1 - Regresar";
		}
		return botMessage;
	}

}

type ChatBotModuleProps = {
	detection?: DetectionRecord
}

export default function ChatBotModule (props: ChatBotModuleProps) {
	const bot = useMemo(() => new Bot(), []);
	const inputRef = useRef<TextInput>(null);
	const [speechDetect, setSpeechDetect] = useState<SpeechText|null>(null);
	const [recording, setRecording] = useState(false);
	// 
	const [messages, setMessages] = useState([
		{
			_id: 1,
			text: bot.response(hello),
			createdAt: new Date(),
			user: { _id: 2, name: "Chatbot" },
		},
	]);

	useEffect(()=>{
		setSpeechDetect( 
			new SpeechText((text)=>{
				if (inputRef.current) {
					inputRef.current.setNativeProps({ text });
				}

			}, (text)=>{
				if (inputRef.current) {
					setRecording(false);
					inputRef.current.setNativeProps({ text });
					TtsVoices.speak(text);
				}

			})
		)
	},[]);

	useEffect(()=>{
		if(props.detection){
			console.log("Received detection data in ChatBotModule:", props.detection);
			//Aquí se podría modificar el estado del bot o enviar un mensaje específico dependiendo de la detección recibida
		}
	},[props.detection])

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

	return (
		<View style={{width:"100%", height:"100%",backgroundColor:"#152712ff"}}>
			<GiftedChat
				textInputRef={inputRef as React.RefObject<TextInput>}
				messages={messages}
				onSend={handleSend}
				user={{ _id: 1, name: "User" }}
			/>
			<View style={{position:"absolute", bottom:-2, right:0, display:"flex", flexDirection:"row"}}>
				<IconButton icon="microphone" iconColor={recording?MD3Colors.error50: MD3Colors.neutral50} onPress={()=>{
					if(!recording){
						speechDetect?.record();
					}else{
						const text = speechDetect?.stop() ?? "";
						if (inputRef.current) {
							inputRef.current.setNativeProps({ text });
							TtsVoices.speak(text);
						}
					}
					setRecording(!recording);
					}}/>
			</View>
		</View>
	);
};
