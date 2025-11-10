import { View, StyleSheet, Button } from 'react-native';
import * as Speech from 'expo-speech';

export default function App() {
  const speak = () => {
    const thingToSay = `

Lunes: 💘bromas💘

Martes: 😝guerras de audios

Miércoles: ✨chicos escogen a chicas✨

Jueves:🤓 fotos🤓

Viernes: 🥳guerra de emojis🥰

Sábado: 😊juegan🥰

Domingo: 🥰Ilamadas🥰
`;
    Speech.speak(thingToSay);
  };

  return (
    <View style={styles.container}>
      <Button title="Press to hear some words" onPress={speak} />
      <Button title="Callese vieja pendeja" onPress={Speech.stop}/>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: '#ecf0f1',
    padding: 8,
    gap:18
  },
});
