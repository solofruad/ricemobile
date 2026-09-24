import type { TourStep } from '@wrack/react-native-tour-guide';

export type ReferenciasTourDeteccion = {
  shutterRef?: React.RefObject<any>;
  focusRef?: React.RefObject<any>;
};

export function buildDeteccionTourSteps(refs: ReferenciasTourDeteccion): TourStep[] {
  return [
    {
      id: 'deteccion-shutter',
      targetRef: refs.shutterRef,
      title: 'Tomar una foto',
      description:
        'Presiona este botón para capturar una fotografía del cultivo. La cámara se enfocará automáticamente en la vista actual.',
      tooltipPosition: 'top',
      spotlightBorderRadius: 45,
    },
    {
      id: 'deteccion-focus',
      targetRef: refs.focusRef,
      title: 'Enfocar la cámara',
      description:
        'Abre el control de enfoque para acercar o ajustar la distancia focal y obtener una imagen más nítida de la planta.',
      tooltipPosition: 'top',
    },
  ];
}

export type ReferenciasTourDeteccionResultados = {
  discardRef?: React.RefObject<any>;
  saveRef?: React.RefObject<any>;
  headerRef?: React.RefObject<any>;
};

export function buildDeteccionResultadosTourSteps(
  refs: ReferenciasTourDeteccionResultados,
): TourStep[] {
  return [
    {
      id: 'deteccion-resultados-header',
      targetRef: refs.headerRef,
      title: 'Resultados de Reconocimiento',
      description:
        'Aquí verás las enfermedades detectadas en tu fotografía. Puedes editar las cajas y etiquetas arrastrándolas sobre la imagen.',
      tooltipPosition: 'bottom',
    },
    {
      id: 'deteccion-resultados-discard',
      targetRef: refs.discardRef,
      title: 'Descartar',
      description:
        'Si no quieres guardar esta foto, presiónala y regresarás a la cámara sin guardar nada.',
      tooltipPosition: 'top',
    },
    {
      id: 'deteccion-resultados-save',
      targetRef: refs.saveRef,
      title: 'Guardar resultado',
      description:
        'Guarda el escaneo en tu galería del Álbum. Después podrás revisarlo o enviarlo al Chatbot para más información.',
      tooltipPosition: 'top',
    },
  ];
}
