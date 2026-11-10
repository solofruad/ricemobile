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

export default class Bot {
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

  hello(){
    return this.response(hello);
  }

}