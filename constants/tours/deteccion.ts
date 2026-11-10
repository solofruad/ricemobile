import type { TourStep } from '@wrack/react-native-tour-guide';

export type ReferenciasTourDeteccion = {
  shutterRef?: React.RefObject<any>;
  focusRef?: React.RefObject<any>;
  /** Dimensiones de la ventana: { width, height }. Si se provee, se agrega el paso introductorio. */
  windowSize?: { width: number; height: number };
};

export function buildDeteccionTourSteps(refs: ReferenciasTourDeteccion): TourStep[] {
  const steps: TourStep[] = [];

  if (refs.windowSize) {
    const { width, height } = refs.windowSize;
    steps.push({
      id: 'deteccion-que-es',
      targetRegion: { x: 20, y: height * 0.3, width: width - 40, height: height * 0.35 },
      title: 'Foto puntual de tu cultivo',
      description:
        'Toma una foto suelta de 1 hoja o mata para saber si está enferma. Es una revisión rápida, distinta del Monitoreo que recorre todo el lote parada por parada.',
      tooltipPosition: 'top',
      spotlightBorderRadius: 18,
    });
  }

  steps.push({
    id: 'deteccion-shutter',
    targetRef: refs.shutterRef,
    title: 'Botón blanco: foto y espera',
    description:
      'Es el botón blanco grande de abajo. Tócalo 1 vez y espera sin salir ni tocar la pantalla: verás Tomando y luego Analizando hasta salir el resultado.',
    tooltipPosition: 'top',
    spotlightBorderRadius: 45,
  });

  steps.push({
    id: 'deteccion-focus',
    targetRef: refs.focusRef,
    title: 'Enfocar: ver nítido',
    description:
      'No es zoom, es foco manual para ver nítida la mancha. Desliza el control: la hojita es para lo de cerca y el paisaje para lejos. Tócalo de nuevo para cerrar y disparar.',
    tooltipPosition: 'top',
  });

  return steps;
}

export type ReferenciasTourDeteccionResultados = {
  discardRef?: React.RefObject<any>;
  saveRef?: React.RefObject<any>;
  headerRef?: React.RefObject<any>;
  /** Dimensiones para el paso de gestos. */
  windowSize?: { width: number; height: number };
};

export function buildDeteccionResultadosTourSteps(
  refs: ReferenciasTourDeteccionResultados,
): TourStep[] {
  const steps: TourStep[] = [
    {
      id: 'deteccion-resultados-que-es',
      targetRef: refs.headerRef,
      title: 'Color, mal y Conf. %',
      description:
        'Cada recuadro marca 1 mancha y cada color es 1 enfermedad distinta. Conf. 90% quiere decir muy seguro: ve a revisar esa mata. Sin recuadros, salió sana.',
      tooltipPosition: 'bottom',
    },
  ];

  if (refs.windowSize) {
    const { width, height } = refs.windowSize;
    steps.push({
      id: 'deteccion-resultados-gestos',
      targetRegion: { x: 20, y: height * 0.22, width: width - 40, height: height * 0.4 },
      title: 'Mueve la foto',
      description:
        'La foto y los recuadros se mueven juntos. Arrastra con 1 dedo, pellizca con 2 para agrandar y gira con 2. Toca 2 veces para volver al tamaño original.',
      tooltipPosition: 'bottom',
      spotlightBorderRadius: 14,
    });
  }

  steps.push({
    id: 'deteccion-resultados-discard',
    targetRef: refs.discardRef,
    title: 'Descartar se pierde',
    description:
      'Vuelve a la cámara sin guardar nada. Ojo: borra la foto y el resultado al instante, sin preguntar. Úsalo si salió movida u oscura.',
    tooltipPosition: 'top',
  });

  steps.push({
    id: 'deteccion-resultados-save',
    targetRef: refs.saveRef,
    title: 'Guardar en tu Álbum',
    description:
      'Guarda la foto en el Álbum de la app, no en la galería del celular. Cambia a Guardado y se bloquea para no duplicar, y vuelve solo a la cámara.',
    tooltipPosition: 'top',
  });

  return steps;
}
