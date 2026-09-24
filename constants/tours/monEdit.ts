import type { TourStep } from '@wrack/react-native-tour-guide';

export type ReferenciasTourMonEdit = {
  resetUndoRef?: React.RefObject<any>;
  helpRef?: React.RefObject<any>;
  modesRef?: React.RefObject<any>;
  windowSize: { width: number; height: number };
};

export function buildMonEditTourSteps(refs: ReferenciasTourMonEdit): TourStep[] {
  const { width, height } = refs.windowSize;
  return [
    {
      id: 'monedit-conceptos',
      targetRegion: { x: 20, y: height * 0.25, width: width - 40, height: height * 0.4 },
      title: 'Conceptos básicos del Editor de Monitoreo',
      description:
        'Aquí se dibuja un polígono cerrado que define el límite del área a monitorear y una ruta en W (línea roja) con el patrón de recorrido para el muestreo. Debe estar completamente dentro del área principal.',
      tooltipPosition: 'bottom',
      spotlightBorderRadius: 18,
    },
    {
      id: 'monedit-mover-agregar',
      targetRegion: { x: 60, y: height * 0.35, width: width - 120, height: height * 0.25 },
      title: 'Mover o agregar puntos',
      description:
        'Toca y arrastra cualquier punto (circulito) para moverlo; el sistema lo evitará con una vibración si el movimiento es inválido. Toca un espacio vacío sobre una línea para agregar un nuevo punto.',
      tooltipPosition: 'top',
    },
    {
      id: 'monedit-undo',
      targetRef: refs.resetUndoRef,
      title: 'Reiniciar y deshacer',
      description:
        'Con "restart" puedes reiniciar el trazado a su estado inicial y con "undo" revertir el último cambio realizado.',
      tooltipPosition: 'top',
    },
    {
      id: 'monedit-modes',
      targetRef: refs.modesRef,
      title: 'Modos de operación',
      description:
        'Lápiz: mover/agregar puntos. Texture-box: visualizar el área de influencia (W) de cada punto. Basura: eliminar puntos. Check: empezar el monitoreo con el trazado actual (pendiente de confirmación, ya no se podrá editar).',
      tooltipPosition: 'top',
    },
  ];
}
