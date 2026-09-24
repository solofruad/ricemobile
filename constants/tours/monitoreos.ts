import type { TourStep } from '@wrack/react-native-tour-guide';

export type ReferenciasTourPanelMonitoreos = {
  headerRef?: React.RefObject<any>;
  listRef?: React.RefObject<any>;
  windowSize: { width: number; height: number };
};

export function buildPanelMonitoreosTourSteps(refs: ReferenciasTourPanelMonitoreos): TourStep[] {
  const { height } = refs.windowSize;
  return [
    {
      id: 'panel-header',
      targetRef: refs.headerRef,
      title: 'Monitoreos realizados',
      description:
        'Aquí encontrarás todos los monitoreos procesados en tu cultivo, agrupados por fecha.',
      tooltipPosition: 'bottom',
    },
    {
      id: 'panel-list',
      targetRegion: { x: 40, y: height * 0.35, width: refs.windowSize.width * 0.8, height: height * 0.4 },
      title: 'Historial de monitoreos',
      description:
        'Cada tarjeta muestra la hora, el número de muestras y las enfermedades detectadas. Toca una para ver el detalle completo por punto de muestreo.',
      tooltipPosition: 'top',
      spotlightBorderRadius: 14,
    },
  ];
}

export type ReferenciasTourMonitoreoDetalle = {
  filterRef?: React.RefObject<any>;
  topDetectionsRef?: React.RefObject<any>;
  samplesPanelRef?: React.RefObject<any>;
  samplesVisible: boolean;
  filterVisible: boolean;
  windowSize: { width: number; height: number };
};

export function buildMonitoreoDetalleTourSteps(
  refs: ReferenciasTourMonitoreoDetalle,
): TourStep[] {
  const steps: TourStep[] = [];
  const { width, height } = refs.windowSize;

  if (refs.filterVisible && refs.filterRef) {
    steps.push({
      id: 'detalle-filtro',
      targetRef: refs.filterRef,
      title: 'Filtrar por enfermedades',
      description:
        'Usa este menú para filtrar el mapa y las detecciones por una enfermedad específica, o para ver todas.',
      tooltipPosition: 'top',
    });
  }

  if (refs.topDetectionsRef) {
    steps.push({
      id: 'detalle-top-detecciones',
      targetRef: refs.topDetectionsRef,
      title: 'Top detecciones',
      description:
        'Resumen de las enfermedades más frecuentes en este monitoreo, con el número de muestras afectadas y el nivel de confianza promedio.',
      tooltipPosition: 'top',
    });
  }

  if (refs.samplesVisible && refs.samplesPanelRef) {
    steps.push({
      id: 'detalle-samples',
      targetRef: refs.samplesPanelRef,
      title: 'Muestras del punto seleccionado',
      description:
        'Toca un punto del mapa para ver sus muestras aquí. Toca una tarjeta para revisar la foto y la detección de ese punto.',
      tooltipPosition: 'top',
    });
  }

  if (steps.length === 0) return steps;
  return steps;
}

export type ReferenciasTourMapaDetalle = {
  windowSize: { width: number; height: number };
};

export function buildMapaDetalleTourSteps(refs: ReferenciasTourMapaDetalle): TourStep[] {
  const { width, height } = refs.windowSize;
  return [
    {
      id: 'detalle-mapa',
      targetRegion: { x: 20, y: height * 0.25, width: width - 40, height: height * 0.45 },
      title: 'Mapa de salud del cultivo',
      description:
        'Cada punto muestra su color según el estado de salud: verde = sano, colores = más muestras con detección de enfermedades. Toca un punto para ver sus muestras.',
      tooltipPosition: 'top',
      spotlightBorderRadius: 18,
    },
  ];
}
