import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import MonEdit, { MonitorDrawingData } from "./MonEdit";
import { useEffect, useState } from "react";
import MonitorDrawingsTable, { MonitorDrawingRecord } from "@/database/tables/MonitorDrawingsTable";
import Sampling from "./Sampling";

export default function MonitorModule(){
  const [useSamplingMode, setUseSamplingMode] = useState(false);
  const [drawingData, setDrawingData] = useState<MonitorDrawingRecord|null>(null);
  useEffect(()=>{
    console.log("flex");
    tryGoToSamplingMode();
  },[]);

  const tryGoToSamplingMode = ()=>{
    console.log("flexb");
    MonitorDrawingsTable.getRecent()
      .then( latestRecord => {
        if(!latestRecord) return;
        setDrawingData(latestRecord);
        setUseSamplingMode(true);
      })
      .then(()=>{
        console.log("flexing");
      })
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
          drawingData={drawingData}
        /> :
        <MonEdit tryGoToSamplingMode={tryGoToSamplingMode}
          drawingData={drawingData}
        />
      }
    </SafeAreaView>
  </SafeAreaProvider>
}