import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import MonEdit from "./MonEdit";
import { useEffect, useState } from "react";
import MonitorDrawingsTable, { MonitorDrawingRecord } from "@/database/tables/MonitorDrawingsTable";
import Sampling from "./Sampling";
import { loadFieldTexture } from "./drawingUtilities/texture";

export default function MonitorModule(){
  const [useSamplingMode, setUseSamplingMode] = useState(false);
  const [drawingData, setDrawingData] = useState<MonitorDrawingRecord|null>(null);
  const [ready, setReady] = useState(false);
  useEffect(()=>{
    loadFieldTexture().catch(()=>{});
    MonitorDrawingsTable.getRecent()
      .then( latestRecord => {
        if(!latestRecord) return;
        setDrawingData(latestRecord);
        setUseSamplingMode(true);
      })
      .catch(error => console.error("Error al cargar el trazado reciente", error))
      .finally(()=>setReady(true));
  },[]);

  const tryGoToSamplingMode = ()=>{
    MonitorDrawingsTable.getRecent()
      .then( latestRecord => {
        if(!latestRecord) return;
        setDrawingData(latestRecord);
        setUseSamplingMode(true);
      })
      .catch(error => console.error("Error al cargar el trazado reciente", error));
  }

  const forcefullyGoToEditMode = () => {
    setUseSamplingMode(false);
  }

  if (!ready) {
    return <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: "#1c100f" }} />
    </SafeAreaProvider>;
  }

  return <SafeAreaProvider>
    <SafeAreaView style={{ flex: 1, display: "flex", flexDirection: "row", position: "relative" }}>
      {
        (drawingData && useSamplingMode) ? 
        <Sampling 
          forcefullyGoToEditMode={forcefullyGoToEditMode}
          drawingData={drawingData}
        /> :
        <MonEdit tryGoToSamplingMode={tryGoToSamplingMode}
          drawingData={drawingData}
        />
      }
    </SafeAreaView>
  </SafeAreaProvider>
}