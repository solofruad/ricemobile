export const TOUR_IDS = {
  DETECCION: 'deteccion',
  DETECCION_RESULTADOS: 'deteccion-resultados',
  CHATBOT: 'chatbot',
  ALBUM: 'album',
  ALBUM_FOTO: 'album-foto',
  MON_EDIT: 'monedit',
  SAMPLING: 'sampling',
  MONITOREOS_PANEL: 'monitoreos-panel',
  MONITOREOS_DETALLE: 'monitoreos-detalle',
} as const;

export type TourId = (typeof TOUR_IDS)[keyof typeof TOUR_IDS];
