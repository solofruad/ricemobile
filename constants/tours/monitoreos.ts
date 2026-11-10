import type { TourStep } from '@wrack/react-native-tour-guide';

export type ReferenciasTourPanelMonitoreos = {
  headerRef?: React.RefObject<any>;
  listRef?: React.RefObject<any>;
  windowSize: { width: number; height: number };
  /** true si ya hay monitoreos procesados para mostrar. */
  hasItems?: boolean;
};

export function buildPanelMonitoreosTourSteps(refs: ReferenciasTourPanelMonitoreos): TourStep[] {
  const { width, height } = refs.windowSize;

  if (refs.hasItems === false) {
    return [
      {
        id: 'panel-vacio',
        targetRegion: { x: 40, y: height * 0.35, width: width * 0.8, height: height * 0.3 },
        title: 'Aún vacío',
        description:
          'Aún no hay monitoreos terminados aquí. Termina tu muestreo con 5 fotos en cada parada y dale Procesar para verlo en esta lista.',
        tooltipPosition: 'top',
        spotlightBorderRadius: 14,
      },
    ];
  }

  return [
    {
      id: 'panel-que-es',
      targetRef: refs.headerRef,
      title: 'Solo lo terminado',
      description:
        'Aquí solo aparece lo ya procesado y terminado. Lo que está a medias en campo sigue en muestreo. Toca la X de arriba o fuera en lo oscuro para cerrar.',
      tooltipPosition: 'bottom',
    },
    {
      id: 'panel-lista',
      targetRegion: { x: 40, y: height * 0.35, width: width * 0.8, height: height * 0.4 },
      title: 'Historial por día',
      description:
        'Están agrupados por día y hora. Muestras son fotos y paradas son esquinas del camino. Toca la tarjeta con > para abrir su mapa de colores y sus fotos.',
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
  /** true si hay top de detecciones para mostrar (evita spotlight vacío en sano). */
  hasTop?: boolean;
  /** true si hay una foto grande abierta encima (el panel queda tapado). */
  photoOpen?: boolean;
  windowSize: { width: number; height: number };
};

export function buildMonitoreoDetalleTourSteps(
  refs: ReferenciasTourMonitoreoDetalle,
): TourStep[] {
  const steps: TourStep[] = [];
  const photoTapada = refs.photoOpen === true;

  if ((!refs.samplesVisible || !refs.samplesPanelRef) && !photoTapada) {
    const { width, height } = refs.windowSize;
    steps.push({
      id: 'detalle-como-abrir',
      targetRegion: { x: 20, y: height * 0.3, width: width - 40, height: height * 0.35 },
      title: 'Toca punto, toca fuera',
      description:
        'Aún no elegiste parada. Toca un círculo del mapa y abajo abre su bandeja con fotos. Toca el mapa en vacío para cerrar. La elegida queda celeste.',
      tooltipPosition: 'top',
      spotlightBorderRadius: 14,
    });
  }

  if (refs.filterVisible && refs.filterRef && !refs.samplesVisible && !photoTapada) {
    steps.push({
      id: 'detalle-filtro',
      targetRef: refs.filterRef,
      title: 'Filtra por mal',
      description:
        'Dice Filtrar y sirve para ver 1 sola enfermedad. El mapa pinta en rojo solo donde salió esa y el resto en verde. Cada opción dice en cuántas fotos salió.',
      tooltipPosition: 'top',
    });
  }

  const showTop = (refs.hasTop ?? refs.filterVisible) && !refs.samplesVisible && !photoTapada;
  if (showTop && refs.topDetectionsRef) {
    steps.push({
      id: 'detalle-top',
      targetRef: refs.topDetectionsRef,
      title: 'Las 3 más vistas',
      description:
        'Son las 3 enfermedades que más salieron en este monitoreo. Conf. 90% quiere decir muy seguro en promedio: conviene ir a revisar esas matas primero.',
      tooltipPosition: 'top',
    });
  }

  if (refs.samplesVisible && refs.samplesPanelRef && !photoTapada) {
    steps.push({
      id: 'detalle-fotos',
      targetRef: refs.samplesPanelRef,
      title: 'Fotos de esa parada',
      description:
        'Son las fotos de la parada elegida. El número dice sus manchas, ej. 3 detecciones. Toca 1 para verla grande con recuadros y vuelve con Cerrar.',
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
      id: 'detalle-titulo-que-es',
      targetRegion: { x: 20, y: height * 0.1, width: width - 40, height: height * 0.12 },
      title: 'Fecha y fotos',
      description:
        'Arriba ves la fecha en que se procesó y cuántas fotos tiene en total. Con la flecha <- de arriba a la izquierda vuelves al historial de monitoreos.',
      tooltipPosition: 'bottom',
      spotlightBorderRadius: 12,
    },
    {
      id: 'detalle-mapa',
      targetRegion: { x: 20, y: height * 0.25, width: width - 40, height: height * 0.45 },
      title: 'Verde, rojo o gris',
      description:
        'Cada círculo es 1 parada: verde sana sin manchas, rojo con enfermedad y gris sin foto. Con 1 sola mancha ya se pone rojo. Toca un círculo para ver abajo sus fotos.',
      tooltipPosition: 'top',
      spotlightBorderRadius: 18,
    },
  ];
}
