import { StyleProp, Text, TouchableOpacity, ViewStyle } from "react-native";

type AppButtonProps = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  color?: string;
};

export default function AppButton(props: AppButtonProps) {
  return (
    <TouchableOpacity
      disabled={props.disabled}
      onPress={props.onPress}
      style={[
        {
          backgroundColor: props.color || "#5189d2",
          borderRadius: 8,
          paddingVertical: 10,
          paddingHorizontal: 28,
          opacity: props.disabled ? 0.5 : 1,
        },
        props.style,
      ]}
    >
      <Text style={{ color: "white", fontSize: 16, fontWeight: "bold", textAlign: "center" }}>
        {props.title}
      </Text>
    </TouchableOpacity>
  );
}