import type { TourStep } from '@wrack/react-native-tour-guide';

export type ReferenciasTourChatbot = {
  inputRef?: React.RefObject<any> | undefined;
  composerControlsRef?: React.RefObject<any>;
  connectionRetryRef?: React.RefObject<any>;
  /** true si hay conexión con el servidor. */
  connected: boolean;
  /** Estado detallado: scanning (buscando), loading (cargando modelos), connected, failed (con Reintentar). */
  connectionState?: 'scanning' | 'loading' | 'connected' | 'failed';
  /** true si se llegó desde el Álbum con una foto (contexto). */
  hasDetectionContext?: boolean;
  /** Dimensiones de la ventana: { width, height } */
  windowSize: { width: number; height: number };
};

export function buildChatbotTourSteps(refs: ReferenciasTourChatbot): TourStep[] {
  const { height, width } = refs.windowSize;
  const state = refs.connectionState ?? (refs.connected ? 'connected' : 'scanning');
  const steps: TourStep[] = [];

  // Sin conexión: solo el paso que sí se ve. Nada de chat/input/controles tapados.
  if (state === 'scanning' || state === 'loading') {
    return [
      {
        id: 'chatbot-buscando',
        targetRegion: { x: 20, y: height * 0.35, width: width - 40, height: height * 0.25 },
        title: 'Buscando servidor',
        description:
          'Espera a que el asistente conecte: verás Buscando o Cargando modelos en pantalla. Sin conexión no puedo responder, así que no escribas aún y revisa que estés en el Wi-Fi RKLLM-AP del equipo.',
        tooltipPosition: 'bottom',
        spotlightBorderRadius: 14,
      },
    ];
  }

  if (state === 'failed' && refs.connectionRetryRef) {
    return [
      {
        id: 'chatbot-retry',
        targetRef: refs.connectionRetryRef,
        title: 'Sin conexión',
        description:
          'No encontré el asistente. Conéctate al Wi-Fi RKLLM-AP del equipo y presiona Reintentar. Si sigue fallando, revisa que el equipo esté encendido y vuelve a intentar.',
        tooltipPosition: 'bottom',
      },
    ];
  }

  steps.push({
    id: 'chatbot-chat',
    targetRegion: { x: 12, y: 200, width: width - 24, height: height - 420 },
    title: 'Aquí hablamos',
    description:
      'Aquí hablamos de males del arroz: síntomas, tratamiento y dudas del cultivo. Mi respuesta aparece mientras la escribo; el botón Enviar se esconde hasta que termine.',
    tooltipPosition: 'bottom',
    spotlightBorderRadius: 18,
  });
  steps.push({
    id: 'chatbot-input',
    targetRef: refs.inputRef,
    title: refs.hasDetectionContext ? 'Ya traje tu foto' : 'Escribe aquí',
    description:
      refs.hasDetectionContext
        ? 'Ya traje tu foto del Álbum. Con tu primera pregunta, ej. cómo la trato, la envío al equipo para analizarla.'
        : 'Escribe con tus palabras, ej. manchas amarillas en la hoja, ¿qué es? Pregunta por síntomas o tratamiento.',
    tooltipPosition: 'top',
  });
  steps.push({
    id: 'chatbot-controles',
    targetRef: refs.composerControlsRef,
    title: 'Avión, micro y detener',
    description:
      'A la derecha verás el avión azul para enviar si escribiste, o el micro para dictar si no hay texto. El micro en rojo está grabando: cuando dejes de hablar, tu pregunta se envía sola y te leo la respuesta en voz alta. Mientras respondo aparece el botón rojo de detener para cortar la respuesta.',
    tooltipPosition: 'top',
  });

  return steps;
}
