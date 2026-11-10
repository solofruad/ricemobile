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
      id: 'monedit-lote',
      targetRegion: { x: 20, y: height * 0.25, width: width - 40, height: height * 0.4 },
      title: 'Rojo lote, verde camino',
      description:
        'El borde rojo es tu lote y la línea verde en zigzag en W es el camino a recorrer. El camino debe quedar siempre dentro del lote, sin pegarse al borde de la parcela.',
      tooltipPosition: 'bottom',
      spotlightBorderRadius: 18,
    },
    {
      id: 'monedit-puntos',
      targetRegion: { x: 60, y: height * 0.35, width: width - 120, height: height * 0.25 },
      title: 'Mueve y agrega',
      description:
        'Toca un círculo y arrástralo para moverlo a su lugar. Toca sobre la línea vacía para agregar una esquina nueva. Si el celular vibra y vuelve, ese lugar no vale.',
      tooltipPosition: 'top',
    },
    {
      id: 'monedit-undo',
      targetRef: refs.resetUndoRef,
      title: 'Volver y deshacer',
      description:
        'Abajo a la izquierda: el círculo reinicia el dibujo a como empezó y pide Aceptar antes de borrar. La curva deshace solo tu último cambio, paso a paso.',
      tooltipPosition: 'top',
    },
    {
      id: 'monedit-modos',
      targetRef: refs.modesRef,
      title: '4 botones abajo',
      description:
        'Abajo a la derecha hay 4 botones. Lápiz mueve y agrega, cuadrito muestra la mancha de cada parada, basura borra esquinas y palomita empieza el monitoreo y ya bloquea la edición.',
      tooltipPosition: 'top',
    },
  ];
}
