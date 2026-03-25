import { useState, useEffect } from 'react';

import { StyleSheet, View, Text, Button } from 'react-native';
import * as vosk from 'react-native-vosk';

export default function SpeechText() {
  const [recognizing, setRecognizing] = useState<Boolean>(false);
  const [result, setResult] = useState<string | undefined>();

  const record = () => {
    vosk
      .start()
      .then(() => {
        console.log('Starting recognition...');
        setRecognizing(true);
      })
      .catch((e) => console.error(e));
  };

  const stop = () => {
    vosk.stop();
    console.log('Stoping recognition...');
    setRecognizing(false);
  };

  useEffect(() => {
    const resultEvent = vosk.onResult((res) => {
      console.log('An onResult event has been caught: ' + res);
      setResult(res);
    });

    const partialResultEvent = vosk.onPartialResult((res) => {
      console.log('An onPartialResult event has been caught: ' + res);
      setResult(res);
    });

    const finalResultEvent = vosk.onFinalResult((res) => {
      console.log('An onFinalResult event has been caught: ' + res);
      setResult(res);
    });



    return () => {
      resultEvent.remove();
      partialResultEvent.remove();
      finalResultEvent.remove();
    };
  }, []);

  return (
    <View style={styles.container}>

      {!recognizing && (
        <View style={styles.recordingButtons}>
          <Button
            title="Record"
            onPress={record}
            color="green"
          />

        </View>
      )}

      {recognizing && <Button onPress={stop} title="Stop" color="red" />}

      <Text style={{color:"white"}}>Recognized word:{result}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 25,
    flex: 1,
    display: 'flex',
    textAlign: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordingButtons: {
    gap: 15,
    display: 'flex',
  },
});