import { createTheme, type TourGuideConfig } from '@wrack/react-native-tour-guide';

const overlayColor = 'rgba(9, 21, 32, 0.78)';
const tooltipBackground = '#fffbf0';
const accentColor = '#ff6d3f';
const textColor = '#263238';

export const appTourTheme = createTheme({
  tooltipStyles: {
    backgroundColor: tooltipBackground,
    borderRadius: 16,
    titleColor: textColor,
    descriptionColor: '#455a64',
    buttonTextColor: '#ffffff',
    primaryButtonColor: accentColor,
    secondaryButtonColor: '#b0bec5',
    skipButtonColor: '#90a4ae',
  },
  spotlightStyles: {
    overlayColor,
    overlayOpacity: 0.78,
    pulseColor: accentColor,
  },
});

export const baseTourConfig: TourGuideConfig = {
  ...appTourTheme,
  nextButtonText: 'Siguiente',
  prevButtonText: 'Atrás',
  skipButtonText: 'Omitir',
  doneButtonText: 'Entendido',
  showProgressDots: true,
  defaultBackdropBehavior: 'next',
  tooltipWidth: 300,
  motion: 'morph',
};
