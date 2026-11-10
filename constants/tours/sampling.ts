import type { TourStep } from '@wrack/react-native-tour-guide';

export type ReferenciasTourSampling = {
  samplesPanelRef?: React.RefObject<any>;
  processRef?: React.RefObject<any>;
  resetHistoryRef?: React.RefObject<any>;
  canvasRef?: React.RefObject<any>;
  /** true si hay una parada seleccionada (bandeja visible). Si es false se omite el paso del panel. */
  samplesVisible?: boolean;
  windowSize: { width: number; height: number };
};

export function buildSamplingTourSteps(refs: ReferenciasTourSampling): TourStep[] {
  const { width, height } = refs.windowSize;
  const steps: TourStep[] = [
    {
      id: 'sampling-que-es',
      targetRegion: { x: 20, y: height * 0.12, width: width - 40, height: height * 0.18 },
      title: 'Recorre tu lote',
      description:
        'Aquí completas el monitoreo que dibujaste. Visita cada parada del camino en W y toma 5 fotos en cada una. Todo se guarda solo en el celular.',
      tooltipPosition: 'bottom',
      spotlightBorderRadius: 14,
    },
    {
      id: 'sampling-canvas',
      targetRegion: { x: 20, y: height * 0.25, width: width - 40, height: height * 0.45 },
      title: 'Toca parada, toca fuera',
      description:
        'Cada círculo verde es 1 parada de muestreo. Toca 1: vibra y abajo abre su bandeja de fotos. Toca fuera del camino y se cierra. El color avanza con tus fotos.',
      tooltipPosition: 'top',
      spotlightBorderRadius: 18,
    },
  ];

  if (refs.samplesVisible && refs.samplesPanelRef) {
    steps.push({
      id: 'sampling-panel',
      targetRef: refs.samplesPanelRef,
      title: 'Bandeja: X de 5',
      description:
        'Arriba dice X de 5 fotos. Cada cuadrito dice sus manchas, ej. 2 detecciones: tócalo para verla grande. El + verde abre la cámara y desaparece al llegar a 5.',
      tooltipPosition: 'top',
    });
  }

  steps.push({
    id: 'sampling-regla-5',
    targetRegion: { x: 20, y: height * 0.68, width: width - 40, height: height * 0.18 },
      title: '5 fotos por parada',
      description:
        'Son obligatorias 5 fotos en cada parada, ni una menos. Abajo ves Seleccione un punto hasta terminar. El botón final solo sale con todo en 5 de 5.',
    tooltipPosition: 'top',
    spotlightBorderRadius: 14,
  });

  if (refs.processRef) {
    steps.push({
      id: 'sampling-process',
      targetRef: refs.processRef,
      title: 'Terminar el monitoreo',
      description:
        'Solo sale con todo en 5 de 5. Al presionarlo se cierra el monitoreo, abre el resumen con su mapa por parada y luego empieza uno nuevo.',
      tooltipPosition: 'top',
      hidePrevButton: true,
    });
  } else {
    steps.push({
      id: 'sampling-process-pendiente',
      targetRegion: { x: 20, y: height * 0.82, width: width - 40, height: height * 0.12 },
      title: 'Aquí saldrá Procesar',
      description:
        'Aún faltan fotos por tomar. Completa cada parada en 5 de 5 y aquí abajo aparecerá Procesar. Revisa la bandeja de cada parada para ver cuántas te faltan.',
      tooltipPosition: 'top',
      spotlightBorderRadius: 14,
    });
  }

  steps.push({
    id: 'sampling-arriba-izq',
    targetRef: refs.resetHistoryRef,
    title: 'Tacho y reloj',
    description:
      'Arriba a la izquierda hay 2 botones. El tacho rediseña el camino y borra dibujo y fotos, pidiendo Sí o No. El reloj solo consulta monitoreos terminados.',
    tooltipPosition: 'bottom',
  });

  return steps;
}
