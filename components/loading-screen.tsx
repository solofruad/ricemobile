import { Text, View } from 'react-native';

type LoadingScreenProps = {
  message: string;
  error: string | null;
};

export default function LoadingScreen({ message, error }: LoadingScreenProps) {
  return (
    <View style={{ flex: 1, backgroundColor: "#091520", justifyContent: "center", alignItems: "center", position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
      {!error?
        <Text style={{ color: "white", width: "100%", textAlign: "center", fontSize: 26 }}>Cargando... {message}</Text>
        :
        <Text style={{ color: "#e78027", width: "100%", textAlign: "center", fontSize: 26 }}>{error}</Text>
      }
    </View>
  );
}