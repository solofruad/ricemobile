import { Text, View } from 'react-native';

type LoadingScreenProps = {
  message: string;
};

export default function LoadingScreen({ message }: LoadingScreenProps) {
  return (
    <View style={{ flex: 1, backgroundColor: "#091520", justifyContent: "center", alignItems: "center", position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
      <Text style={{ color: "white", position: "absolute", top: "50%", width: "100%", textAlign: "center", fontSize: 26 }}>Cargando... {message}</Text>
    </View>
  );
}