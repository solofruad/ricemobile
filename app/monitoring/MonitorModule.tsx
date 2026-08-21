import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import MonEdit from "./MonEdit";
import { useEffect, useState } from "react";
import MonitorDrawingsTable, { MonitorDrawingRecord } from "@/database/tables/MonitorDrawingsTable";
import MonitoringsTable from "@/database/tables/MonitoringsTable";
import Sampling from "./Sampling";
import { loadFieldTexture } from "./drawingUtilities/texture";

export default function MonitorModule(){
  const [useSamplingMode, setUseSamplingMode] = useState(false);
  const [drawingData, setDrawingData] = useState<MonitorDrawingRecord|null>(null);
  const [monitoringId, setMonitoringId] = useState<number|null>(null);
  const [ready, setReady] = useState(false);
  useEffect(()=>{
    loadFieldTexture().catch(()=>{});
    MonitorDrawingsTable.getRecent()
      .then( latestRecord => {
        if(!latestRecord) return;
        setDrawingData(latestRecord);
        return MonitoringsTable.getActiveByDrawingId(latestRecord.id)
          .then(activeMonitoring => {
            if(activeMonitoring){
              setMonitoringId(activeMonitoring.id);
              setUseSamplingMode(true);
            } else {
              setUseSamplingMode(true);
            }
          });
      })
      .catch(error => console.error("Error al cargar el trazado reciente", error))
      .finally(()=>setReady(true));
  },[]);

  const tryGoToSamplingMode = (newMonitoringId?: number)=>{
    MonitorDrawingsTable.getRecent()
      .then( latestRecord => {
        if(!latestRecord) return;
        setDrawingData(latestRecord);
        if (newMonitoringId !== undefined) {
          setMonitoringId(newMonitoringId);
          setUseSamplingMode(true);
          return;
        }
        return MonitoringsTable.getActiveByDrawingId(latestRecord.id)
          .then(activeMonitoring => {
            if(activeMonitoring) setMonitoringId(activeMonitoring.id);
            setUseSamplingMode(true);
          });
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
          monitoringId={monitoringId}
        /> :
        <MonEdit tryGoToSamplingMode={tryGoToSamplingMode}
          drawingData={drawingData}
        />
      }
    </SafeAreaView>
  </SafeAreaProvider>
}