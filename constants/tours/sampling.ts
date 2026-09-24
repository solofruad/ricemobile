import type { TourStep } from '@wrack/react-native-tour-guide';

export type ReferenciasTourSampling = {
  samplesPanelRef?: React.RefObject<any>;
  processRef?: React.RefObject<any>;
  resetHistoryRef?: React.RefObject<any>;
  canvasRef?: React.RefObject<any>;
  windowSize: { width: number; height: number };
};

export function buildSamplingTourSteps(refs: ReferenciasTourSampling): TourStep[] {
  const { width, height } = refs.windowSize;
  return [
    {
      id: 'sampling-canvas',
      targetRegion: { x: 20, y: height * 0.25, width: width - 40, height: height * 0.45 },
      title: 'Puntos de muestreo',
      description:
        'Cada punto del trazado en W es un punto de muestreo. Toca cualquiera para abrir el panel de muestras de ese punto.',
      tooltipPosition: 'top',
      spotlightBorderRadius: 18,
    },
    {
      id: 'sampling-samples-panel',
      targetRef: refs.samplesPanelRef,
      title: 'Muestras del punto seleccionado',
      description:
        'Aquí verás las fotos tomadas en el punto (de 5) con su número de detecciones. Toca una para revisar su resultado, o el botón "+" para tomar una nueva muestra con la cámara.',
      tooltipPosition: 'top',
    },
    {
      id: 'sampling-process',
      targetRef: refs.processRef,
      title: 'Procesar muestras',
      description:
        'Cuando todos los puntos tengan sus 5 muestras, este botón procesará el monitoreo y te mostrará los resultados por punto.',
      tooltipPosition: 'top',
      hidePrevButton: true,
    },
    {
      id: 'sampling-reset-history',
      targetRef: refs.resetHistoryRef,
      title: 'Rediseñar trazado y monitoreos previos',
      description:
        'Con "delete-outline" puedes rediseñar el trazado (descartará las muestras tomadas) y con "history" consultar los monitoreos ya procesados.',
      tooltipPosition: 'bottom',
    },
  ];
}
