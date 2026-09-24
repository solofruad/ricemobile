import type { TourStep } from '@wrack/react-native-tour-guide';

export type ReferenciasTourChatbot = {
  inputRef?: React.RefObject<any> | undefined;
  composerControlsRef?: React.RefObject<any>;
  connectionRetryRef?: React.RefObject<any>;
  /** Nueva conexión fallida (feedback/Reintentar presente) */
  connected: boolean;
  /** Dimensiones de la ventana: { width, height } */
  windowSize: { width: number; height: number };
};

export function buildChatbotTourSteps(refs: ReferenciasTourChatbot): TourStep[] {
  const { height } = refs.windowSize;
  const steps: TourStep[] = [
    {
      id: 'chatbot-chat-area',
      targetRegion: { x: 12, y: 200, width: refs.windowSize.width - 24, height: height - 420 },
      title: 'Tu conversación con el Chatbot',
      description:
        'Aquí verás los mensajes que envías y las respuestas del asistente sobre enfermedades del arroz.',
      tooltipPosition: 'bottom',
      spotlightBorderRadius: 18,
    },
    {
      id: 'chatbot-input',
      targetRef: refs.inputRef,
      title: 'Escribe tu pregunta',
      description:
        'Escribe aquí lo que quieras preguntarle al asistente: síntomas, tratamientos o dudas sobre tu cultivo.',
      tooltipPosition: 'top',
    },
    {
      id: 'chatbot-controls',
      targetRef: refs.composerControlsRef,
      title: 'Enviar o dictar por voz',
      description:
        'Con texto escrito usa el botón "Enviar". Sin texto, usa el micrófono para dictar tu pregunta y escuchar la respuesta en voz alta.',
      tooltipPosition: 'top',
    },
  ];

  if (!refs.connected && refs.connectionRetryRef) {
    steps.push({
      id: 'chatbot-retry',
      targetRef: refs.connectionRetryRef,
      title: 'Reintentar conexión',
      description:
        'Si no se encuentra el servidor de LLM, verifica la conexión al hotspot del dispositivo y presiona "Reintentar".',
      tooltipPosition: 'bottom',
    });
  }

  return steps;
}
