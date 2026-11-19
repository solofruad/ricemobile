import ChatBotModule from "../chatbot/ChatBotModule";
import { useLocalSearchParams } from 'expo-router';
import { DetectionRecord } from "@/database/tables/DetectionsTable";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

export default function Chatbot(){
  const params = useLocalSearchParams();
  return(
  <SafeAreaProvider>
    <SafeAreaView>
<ChatBotModule
  detection={params.detection ? (JSON.parse(params.detection as string) as DetectionRecord): undefined}
  // Cambia en cada "Chatbot" del Álbum: reinicia la conversación aunque sea la misma foto
  attachKey={typeof params.attachedAt === "string" ? params.attachedAt : undefined}
/>
    </SafeAreaView>
  </SafeAreaProvider>)

}
