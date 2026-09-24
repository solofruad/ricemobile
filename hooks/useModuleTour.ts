import { useCallback, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { useTourGuide, resolveSafeAreaInsets, type TourGuideConfig, type TourStep } from '@wrack/react-native-tour-guide';
import ToursTable from '@/database/tables/ToursTable';
import { baseTourConfig } from '@/constants/tours/tourTheme';

export type ModuleTourTarget = Record<string, RefObject<any> | null | undefined>;

export type ModuleTourOptions = Omit<TourGuideConfig, 'tourId' | 'onTourEnd'> & {
  getCurrentScrollOffset?: () => number;
};

export function useModuleTour() {
  const { startTour, isActive } = useTourGuide();
  const [starting, setStarting] = useState(false);
  const markSeenRef = useRef<string | null>(null);

  const startModuleTour = useCallback(
    (tourId: string, getSteps: () => TourStep[], options?: ModuleTourOptions) => {
      if (isActive) {
        return;
      }

      const { getCurrentScrollOffset, ...config } = options ?? {};
      // La app corre en edge-to-edge (app.json edgeToEdgeEnabled: true), por lo que
      // measureInWindow ya devuelve coordenadas respecto a la ventana completa y la
      // corrección del status bar de la librería (modo modal, Android) desalinea el
      // spotlight/tooltip. Se anula con insets.top = 0 y se recupera la holgura para
      // el clamp de tooltips vía extraInsets.top.
      const safeAreaTop = config.insets?.top ?? resolveSafeAreaInsets({ insets: config.insets }).top;
      const mergedConfig: TourGuideConfig = {
        ...baseTourConfig,
        ...config,
        insets: { top: 25, ...(config.insets ?? {}) },
        extraInsets: { top: safeAreaTop, ...(config.extraInsets ?? {}) },
        tourId,
        onTourEnd: () => {
          if (markSeenRef.current) {
            const tourToMark = markSeenRef.current;
            markSeenRef.current = null;
            ToursTable.markSeen(tourToMark).catch((err) =>
              console.warn(`No se pudo marcar el tour "${tourToMark}" como visto`, err),
            );
          }
        },
      };

      if (config.scrollRef && getCurrentScrollOffset) {
        mergedConfig.getCurrentScrollOffset = getCurrentScrollOffset;
      }

      markSeenRef.current = null;
      setStarting(true);
      ToursTable.isSeen(tourId)
        .catch(() => false)
        .then((seen) => {
          if (!seen) {
            markSeenRef.current = tourId;
          }
        })
        .finally(() => {
          setStarting(false);
          startTour(getSteps(), mergedConfig);
        });
    },
    [startTour, isActive],
  );

  return { startModuleTour, isTourActive: isActive, isTourStarting: starting };
}
