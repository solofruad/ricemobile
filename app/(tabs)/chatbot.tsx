import { useEffect } from "react";
import ChatBotModule from "../chatbot/ChatBotModule";
import { useLocalSearchParams } from 'expo-router';
import { DetectionRecord } from "@/database/tables/DetectionsTable";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

export default function Chatbot(){
  const params = useLocalSearchParams();
  useEffect(()=>{

  },[params]);
  return(
  <SafeAreaProvider>
    <SafeAreaView>
<ChatBotModule detection={params.detection ? (JSON.parse(params.detection as string) as DetectionRecord): undefined}/>
    </SafeAreaView>
  </SafeAreaProvider>)
  
}