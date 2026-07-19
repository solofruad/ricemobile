import { useEffect } from "react";
import ChatBotModule from "../chatbot/ChatBotModule";
import { useLocalSearchParams } from 'expo-router';
import { DetectionRecord } from "@/database/tables/DetectionsTable";

export default function Chatbot(){
  const params = useLocalSearchParams();
  useEffect(()=>{

  },[params]);
  return <ChatBotModule detection={params.detection ? (JSON.parse(params.detection as string) as DetectionRecord): undefined}/>
}