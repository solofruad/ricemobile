import { View, StyleSheet, Button } from 'react-native';
import * as Speech from 'expo-speech';

export default function App() {
  const speak = () => {
    const thingToSay = `

El otro dia me volvi a ver la pelicula de Smile 2 ya que estuve un tiempo ahorrando para comprarme un reproductor blu-ray por que estaba harta de tener que descargarme todas las aplicaciones y aun asi no tener para ver las peliculas que quiero

El caso esque mientras estaba comprando las peluculas me encontre con Smile 2 y la verdad esque pense que era una pelicula buena para volver a ver,yo la vi en su estreno y me gusto

Total,salgo de comprarlas y en eso por el camino me encuentro a un conocido y me pregunta como estoy y sobre las peliculas que compre

Pero en cuento le mencione que me compre la de smile 2 se me pone a decir cosas como que malgaste el dinero por que esa pelicula no da miedo,que el se quedo dormido viendola y no se que mas

No entiendo,gente que ya esta en edad de trabajar tratando de demostrar valentia con una pelicula de miedo,ya sabemos que eres muy valiente,ya sabemos que no tienes doce años,logicamente yo no me voy a quedar sin dormir por verla por que se que no es real,simplemente quiero disfrutar de la pelicula
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
    padding: 8,
    gap:18
  },
});
