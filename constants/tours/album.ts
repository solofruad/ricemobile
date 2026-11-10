import type { TourStep } from '@wrack/react-native-tour-guide';

export type ReferenciasTourAlbum = {
  galleryRef?: React.RefObject<any>;
  deleteRef?: React.RefObject<any>;
  chatbotRef?: React.RefObject<any>;
  closeRef?: React.RefObject<any>;
  windowSize: { width: number; height: number };
  /** true si hay fotos guardadas. Si es false, se explica el estado vacío. */
  hasImages?: boolean;
};

export function buildAlbumTourSteps(refs: ReferenciasTourAlbum): TourStep[] {
  // Estado vacío: orientar hacia Detección en vez de apuntar a una lista vacía.
  if (refs.hasImages === false) {
    const { width, height } = refs.windowSize;
    return [
      {
        id: 'album-vacio',
        targetRegion: { x: 20, y: height * 0.35, width: width - 40, height: height * 0.3 },
        title: 'Aún no tienes fotos',
        description:
          'Aún no hay fotos guardadas aquí. Ve a Detección, toma 1 foto de una hoja y dale Guardar. Al volver saldrán 3 por fila para revisar.',
        tooltipPosition: 'bottom',
        spotlightBorderRadius: 14,
      },
    ];
  }

  return [
    {
      id: 'album-galeria',
      targetRef: refs.galleryRef,
      title: 'Tus fotos guardadas',
      description:
        'Son resultados guardados desde Detección o desde un Muestreo. Se muestran 3 por fila. Toca 1 foto para verla grande con sus recuadros de enfermedad.',
      tooltipPosition: 'top',
      spotlightBorderRadius: 18,
    },
  ];
}

export function buildAlbumFotoTourSteps(refs: ReferenciasTourAlbum): TourStep[] {
  const { width, height } = refs.windowSize;
  return [
    {
      id: 'album-foto',
      targetRegion: { x: 20, y: height * 0.2, width: width - 40, height: height * 0.5 },
      title: 'Foto y colores',
      description:
        'Ves la foto con recuadros de colores, cada color 1 enfermedad con su Conf. %. Desliza a los lados para cambiar de foto. Si se ve girada es normal de la cámara.',
      tooltipPosition: 'bottom',
    },
    {
      id: 'album-foto-delete',
      targetRef: refs.deleteRef,
      title: 'Borrar no pregunta',
      description:
        'El botón Borrar de abajo elimina la foto y su resultado al instante, sin pedir confirmación y sin papelera. Úsalo solo si estás muy seguro.',
      tooltipPosition: 'top',
    },
    {
      id: 'album-foto-chatbot',
      targetRef: refs.chatbotRef,
      title: 'Manda al Chatbot',
      description:
        'El botón Chatbot lleva esta foto al asistente para preguntar por ella. Allá escribe tu primera pregunta, ej. qué tratamiento le doy, para activar ese resultado.',
      tooltipPosition: 'top',
    },
    {
      id: 'album-foto-close',
      targetRef: refs.closeRef,
      title: 'Cerrar para volver',
      description:
        'El botón Cerrar de abajo es la única forma de volver a la galería. Tocar fuera de la foto no cierra. Arriba tienes ? para repetir la ayuda.',
      tooltipPosition: 'top',
    },
  ];
}
