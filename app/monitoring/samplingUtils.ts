import { ObjectDetectionResult } from "@/src/ObjectDetection";

export const MIN_CONFIDENCE = 0.3;

export const filterDetectionsByConfidence = (
  detections: ObjectDetectionResult[],
  threshold: number = MIN_CONFIDENCE
): ObjectDetectionResult[] => {
  return detections
    .map((det) => ({
      ...det,
      labels: det.labels.filter((label) => label.confidence >= threshold),
    }))
    .filter((det) => det.labels.length > 0);
};

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

export type DetectionListingEntry = {
  label: { text: string; confidence: number };
  index_sampling_point: number;
  index_photo_in_sampling_point: number;
};

export const detectionsListing = (tableInfo: SamplingData[][], threshold: number = MIN_CONFIDENCE): DetectionListingEntry[] => {
  return tableInfo
    .flat()
    .filter((s): s is SamplingData => !!s)
    .flatMap((sample) => {
      const filtered = filterDetectionsByConfidence(sample.detection, threshold);
      return filtered.map((det) => ({
        label: det.labels[0],
        index_sampling_point: sample.index_sampling_point,
        index_photo_in_sampling_point: sample.index_photo_in_sampling_point,
      }));
    });
};

export const summarizeDetections = (samplings: SamplingData[][], threshold: number = MIN_CONFIDENCE) => {
  const allSamples = samplings.flat().filter((s): s is SamplingData => !!s);
  const totalSamples = allSamples.length;
  const pointsWithSamples = samplings.filter((samples) => samples?.length > 0).length;
  const diseases: Record<string, { count: number; confidenceSum: number; affectedPoints: Set<number> }> = {};
  let totalDetections = 0;

  allSamples.forEach((sample) => {
    const filtered = filterDetectionsByConfidence(sample.detection, threshold);
    filtered.forEach((det) => {
      det.labels.forEach((label) => {
        totalDetections++;
        const entry = diseases[label.text] || (diseases[label.text] = { count: 0, confidenceSum: 0, affectedPoints: new Set() });
        entry.count++;
        entry.confidenceSum += label.confidence;
        entry.affectedPoints.add(sample.index_sampling_point);
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
      affectedPoints: value.affectedPoints.size,
    })),
  };
};

export type DiseaseDistribution = {
  name: string;
  count: number;
  avgConfidence: number;
  affectedPoints: number;
  percentage: number;
};

export const computeDiseaseDistribution = (samplings: SamplingData[][], threshold: number = MIN_CONFIDENCE): DiseaseDistribution[] => {
  const summary = summarizeDetections(samplings, threshold);
  if (summary.totalDetections === 0) return [];

  return summary.diseases
    .map((d) => ({
      ...d,
      percentage: (d.count / summary.totalDetections) * 100,
    }))
    .sort((a, b) => b.count - a.count);
};

export type IncidenceByPoint = {
  pointIndex: number;
  totalPhotos: number;
  photosWithDetections: number;
  incidenceRate: number;
  diseases: Record<string, number>;
};

export const computeIncidenceByZone = (samplings: SamplingData[][], threshold: number = MIN_CONFIDENCE): IncidenceByPoint[] => {
  return samplings.map((samples, pointIndex) => {
    if (!samples?.length) {
      return { pointIndex, totalPhotos: 0, photosWithDetections: 0, incidenceRate: 0, diseases: {} };
    }

    const diseases: Record<string, number> = {};
    let photosWithDetections = 0;

    samples.forEach((sample) => {
      const filtered = filterDetectionsByConfidence(sample.detection, threshold);
      if (filtered.length > 0) {
        photosWithDetections++;
      }
      filtered.forEach((det) => {
        det.labels.forEach((label) => {
          diseases[label.text] = (diseases[label.text] || 0) + 1;
        });
      });
    });

    return {
      pointIndex,
      totalPhotos: samples.length,
      photosWithDetections,
      incidenceRate: photosWithDetections / samples.length,
      diseases,
    };
  });
};

export const computeHealthPerPoint = (samplings: SamplingData[][], threshold: number = MIN_CONFIDENCE): number[] => {
  return samplings.map((samples) => {
    if (!samples?.length) return 0;
    const hasDetection = samples.some((sample) => {
      const filtered = filterDetectionsByConfidence(sample.detection, threshold);
      return filtered.length > 0;
    });
    return hasDetection ? 2 : 1;
  });
};

export const computeHealthPerPointFiltered = (samplings: SamplingData[][], diseaseName: string | null, threshold: number = MIN_CONFIDENCE): number[] => {
  if (!diseaseName) return computeHealthPerPoint(samplings, threshold);
  return samplings.map((samples) => {
    if (!samples?.length) return 0;
    const hasDisease = samples.some((sample) => {
      const filtered = filterDetectionsByConfidence(sample.detection, threshold);
      return filtered.some((det) => det.labels.some((label) => label.text === diseaseName));
    });
    return hasDisease ? 2 : 1;
  });
};