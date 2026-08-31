const DISEASE_COLOR_PALETTE = [
  "#E63946",
  "#F4A261",
  "#2A9D8F",
  "#264653",
  "#9B5DE5",
  "#00BBF9",
  "#F15BB5",
  "#FEE440",
  "#00F5D4",
  "#FB5607",
];

const DEFAULT_COLOR = "#6C757D";

const diseaseColorMap: Record<string, string> = {};

let colorIndex = 0;

export const getDiseaseColor = (diseaseName: string): string => {
  if (diseaseColorMap[diseaseName]) {
    return diseaseColorMap[diseaseName];
  }
  const color = DISEASE_COLOR_PALETTE[colorIndex % DISEASE_COLOR_PALETTE.length];
  diseaseColorMap[diseaseName] = color;
  colorIndex++;
  return color;
};

export const getDiseaseColorMap = (diseaseNames: string[]): Record<string, string> => {
  const map: Record<string, string> = {};
  diseaseNames.forEach((name) => {
    map[name] = getDiseaseColor(name);
  });
  return map;
};

export const getHealthColor = (healthCode: number, diseaseName?: string): string => {
  if (healthCode === 0) return "#9e9e9e";
  if (healthCode === 1) return "#2cac0f";
  if (diseaseName) return getDiseaseColor(diseaseName);
  return "#d25151";
};
