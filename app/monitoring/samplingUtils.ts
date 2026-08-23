import { ObjectDetectionResult } from "@/src/ObjectDetection";

export type SamplingData = {
  id_monitoring: number;
  index_sampling_point: number;
  index_photo_in_sampling_point: number;
  photo_dir: string;
  detection: ObjectDetectionResult[];
};

export const buildSamplingsMatrix = (records: SamplingData[]): SamplingData[][] => {
  const matrix: SamplingData[][] = [];
  records.forEach((record) => {
    const point = record.index_sampling_point;
    if (matrix[point] === undefined) {
      matrix[point] = [];
    }
    matrix[point][record.index_photo_in_sampling_point] = record;
  });
  return matrix;
};

export const detectionsListing = (tableInfo: SamplingData[][]) => { //TODO: IMPLEMENTAR
  return tableInfo
  .flat() //Per sample
	.map(
		e => {
      //TODO: hacer unico por si en una misma muestra se detecta mas de una vez la misma enfermedad
			return e.detection.map( //per detection in each sample
				h => ({
					detection:h.labels[0], 
					index_sampling_point:e.index_sampling_point, 
					index_photo_in_sampling_point: e.index_photo_in_sampling_point
				})
			)
	})
	.flat()
}

export const summarizeDetections = (samplings: SamplingData[][]) => {
  const totalSamples = samplings.flat().length;
  const pointsWithSamples = samplings.filter((samples) => samples?.length > 0).length;
  const diseases: Record<string, { count: number; confidenceSum: number }> = {};
  let totalDetections = 0;

  samplings.flat().forEach((sample) => {
    sample.detection.forEach((det) => {
      det.labels.forEach((label) => {
        totalDetections++;
        const entry = diseases[label.text] || (diseases[label.text] = { count: 0, confidenceSum: 0 });
        entry.count++;
        entry.confidenceSum += label.confidence;
      });
    });
  });

  return {
    totalSamples,
    pointsWithSamples,
    totalDetections,
    diseases: Object.entries(diseases).map(([name, value]) => ({
      name,
      count: value.count,
      avgConfidence: value.confidenceSum / value.count,
    })),
  };
};

export const computeHealthPerPoint = (samplings: SamplingData[][]): number[] => {
  return samplings.map((samples) => {
    if (!samples?.length) return 0;
    const hasDetection = samples.some((sample) => sample.detection.some((det) => det.labels.length > 0));
    return hasDetection ? 2 : 1;
  });
};

export const computeHealthPerPointFiltered = (samplings: SamplingData[][], diseaseName: string | null): number[] => {
  if (!diseaseName) return computeHealthPerPoint(samplings);
  return samplings.map((samples) => {
    if (!samples?.length) return 0;
    const hasDisease = samples.some((sample) =>
      sample.detection.some((det) => det.labels.some((label) => label.text === diseaseName))
    );
    return hasDisease ? 2 : 1;
  });
};