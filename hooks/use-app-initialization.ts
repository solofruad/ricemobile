import Database from '@/database/Database';
import DetectionsTable from '@/database/tables/DetectionsTable';
import MonitorDrawingsTable from '@/database/tables/MonitorDrawingsTable';
import { TtsVoices } from '@/src/TtsVoices';
import { useEffect, useState } from 'react';
import * as vosk from 'react-native-vosk';
import { ObjectDetection } from '@/src/ObjectDetection';

const TTS_LANGUAGE = "es";
const OBJECT_DETECTOR_MAX_RESULTS = 7;
const OBJECT_DETECTOR_SCORE_THRESHOLD = 0.4;

function startTtsVoice(): Promise<void> {
  return new Promise(resolve => {
    TtsVoices.init(TTS_LANGUAGE)
      .then(_ => {
        resolve();
        TtsVoices.speak("Bienvenido nuevamente.");
      })
      .catch(err => {
        console.error(err)
        TtsVoices.openVoicesInstaller()
        resolve();
      })
  });
}

async function runInitializationStep(
  name: string,
  setLoadPhase: (phase: string) => void,
  task: () => Promise<void>,
) {
  setLoadPhase(name);
  try {
    await task();
  } catch (err) {
    console.log(`Error initializing ${name}`, err);
  }
}

export function useAppInitialization() {
  const [loadPhase, setLoadPhase] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      new Database();
      await runInitializationStep("DetectionsTable", setLoadPhase, () =>
        DetectionsTable.initTable(),
      );
      await runInitializationStep("MonitorDrawingsTable", setLoadPhase, () =>
        MonitorDrawingsTable.initTable(),
      );
      await runInitializationStep("TtsVoices", setLoadPhase, startTtsVoice);
      await runInitializationStep("ObjectDetection", setLoadPhase, () =>
        ObjectDetection.initializeDetector(OBJECT_DETECTOR_MAX_RESULTS, OBJECT_DETECTOR_SCORE_THRESHOLD),
      );
      await runInitializationStep("VoskSTT", setLoadPhase, () =>
        vosk.loadModel('model-es-es'),
      );
      if (mounted) setReady(true);
    };

    initialize();

    return () => {
      mounted = false;
    };
  }, []);

  return { loadPhase, ready };
}