import type { TourStep } from '@wrack/react-native-tour-guide';

export type ReferenciasTourAlbum = {
  galleryRef?: React.RefObject<any>;
  deleteRef?: React.RefObject<any>;
  chatbotRef?: React.RefObject<any>;
  closeRef?: React.RefObject<any>;
  windowSize: { width: number; height: number };
};

export function buildAlbumTourSteps(refs: ReferenciasTourAlbum): TourStep[] {
  return [
    {
      id: 'album-gallery',
      targetRef: refs.galleryRef,
      title: 'Tu galería de escaneos',
      description:
        'Cada imagen es un resultado de reconocimiento guardado desde Detección. Toca una foto para verla en pantalla completa con sus detecciones.',
      tooltipPosition: 'top',
      spotlightBorderRadius: 18,
    },
  ];
}

export function buildAlbumFotoTourSteps(refs: ReferenciasTourAlbum): TourStep[] {
  const { width, height } = refs.windowSize;
  return [
    {
      id: 'album-foto-lista',
      targetRegion: { x: 20, y: height * 0.2, width: width - 40, height: height * 0.5 },
      title: 'Vista a pantalla completa',
      description:
        'Desliza a los lados para pasar entre tus escaneos guardados.',
      tooltipPosition: 'bottom',
    },
    {
      id: 'album-foto-delete',
      targetRef: refs.deleteRef,
      title: 'Borrar',
      description:
        'Elimina este escaneo de tu galería. La foto se borrará definitivamente de la base de datos.',
      tooltipPosition: 'top',
    },
    {
      id: 'album-foto-chatbot',
      targetRef: refs.chatbotRef,
      title: 'Consultar al Chatbot',
      description:
        'Envía este resultado al Chatbot: el asistente recibirá la información de las enfermedades detectadas y podrás preguntarte por ellas.',
      tooltipPosition: 'top',
    },
    {
      id: 'album-foto-close',
      targetRef: refs.closeRef,
      title: 'Cerrar',
      description: 'Vuelve a la galería sin hacer cambios.',
      tooltipPosition: 'top',
    },
  ];
}
