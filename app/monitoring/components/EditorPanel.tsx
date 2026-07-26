import { View } from "react-native";

type EditorPanelProps = {
  children: React.ReactNode
  flexDirection?: "row" | "column"
}

export default function EditorPanel(props:EditorPanelProps) {
  return <View style={{ 
            display: "flex", 
            flexDirection: props.flexDirection || "column", 
            gap: 5, 
            backgroundColor: "rgb(255, 255, 255)",
            boxShadow: "0px 0px 4px 2px rgba(0, 0, 0, 0.4)",
            borderRadius: 10, 
            paddingHorizontal: 2, 
            paddingVertical: 1 }}>
              {props.children}
            </View>
}