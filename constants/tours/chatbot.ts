import type { TourStep } from '@wrack/react-native-tour-guide';

export type ReferenciasTourChatbot = {
  inputRef?: React.RefObject<any> | undefined;
  composerControlsRef?: React.RefObject<any>;
  connectionRetryRef?: React.RefObject<any>;
  /** true si hay conexión con el servidor. */
  connected: boolean;
  /** Estado detallado: scanning (buscando), connected, failed (con Reintentar). */
  connectionState?: 'scanning' | 'connected' | 'failed';
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
  if (state === 'scanning') {
    return [
      {
        id: 'chatbot-buscando',
        targetRegion: { x: 20, y: height * 0.35, width: width - 40, height: height * 0.25 },
        title: 'Buscando servidor',
        description:
          'Espera a que el servidor conecte: verás Buscando en pantalla. Sin conexión no puedo responder, así que no escribas aún y revisa el hotspot del equipo.',
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
          'No encontré el servidor. Conéctate al hotspot o wifi del equipo y presiona Reintentar. Si sigue fallando, apaga y prende el hotspot y vuelve a intentar.',
        tooltipPosition: 'bottom',
      },
    ];
  }

  steps.push({
    id: 'chatbot-chat',
    targetRegion: { x: 12, y: 200, width: width - 24, height: height - 420 },
    title: 'Aquí hablamos',
    description:
      'Aquí hablamos de males del arroz: síntomas, tratamiento y dudas del cultivo. Mientras pienso mi respuesta el botón Enviar se esconde un momento: espera.',
    tooltipPosition: 'bottom',
    spotlightBorderRadius: 18,
  });
  steps.push({
    id: 'chatbot-input',
    targetRef: refs.inputRef,
    title: refs.hasDetectionContext ? 'Ya traje tu foto' : 'Escribe aquí',
    description:
      refs.hasDetectionContext
        ? 'Ya traje tu foto del Álbum y sé qué salió. Escribe tu primera pregunta, ej. cómo la trato, para activar ese resultado.'
        : 'Escribe con tus palabras, ej. manchas amarillas en la hoja, ¿qué es? Pregunta por síntomas o tratamiento.',
    tooltipPosition: 'top',
  });
  steps.push({
    id: 'chatbot-controles',
    targetRef: refs.composerControlsRef,
    title: 'Avión, micro y rojo',
    description:
      'A la derecha verás el avión azul para enviar si escribiste, o el micro para dictar si no hay texto. El micro en rojo está grabando. Mi respuesta solo se lee en pantalla.',
    tooltipPosition: 'top',
  });

  return steps;
}
