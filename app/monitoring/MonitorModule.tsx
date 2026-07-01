import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import MonEdit, { MonitorDrawingData } from "./MonEdit";
import { useEffect, useState } from "react";
import MonitorDrawingsTable, { MonitorDrawingRecord } from "@/database/MonitorDrawingsTable";
import Sampling from "./Sampling";

export default function MonitorModule(){
  const [useSamplingMode, setUseSamplingMode] = useState(false);
  const [drawingData, setDrawingData] = useState<MonitorDrawingRecord|null>(null);
  useEffect(()=>{
    tryGoToSamplingMode();
  },[]);

  const tryGoToSamplingMode = ()=>{
    MonitorDrawingsTable.getRecent()
      .then( latestRecord => {
        if(!latestRecord) return;
        setDrawingData(latestRecord);
        setUseSamplingMode(true);
      });
  }

  const forcefullyGoToEditMode = () => {
    setUseSamplingMode(false);
  }

  return <SafeAreaProvider>
    <SafeAreaView style={{ flex: 1, display: "flex", flexDirection: "row", position: "relative" }}>
      {
        (drawingData && useSamplingMode) ? 
        <Sampling 
          forcefullyGoToEditMode={forcefullyGoToEditMode}
          polygonPoints={(drawingData?.drawing_json as MonitorDrawingData).polygon}
          wPathPoints={(drawingData?.drawing_json as MonitorDrawingData).wPath}/> :
        <MonEdit tryGoToSamplingMode={tryGoToSamplingMode}
          polygonPoints={drawingData ? (drawingData?.drawing_json as MonitorDrawingData).polygon : null}
          wPathPoints={drawingData ? (drawingData?.drawing_json as MonitorDrawingData).wPath : null}/>
      }
    </SafeAreaView>
  </SafeAreaProvider>
}