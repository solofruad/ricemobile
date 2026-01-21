import { useEffect, useState } from "react";
import { View, Text, Modal, TouchableOpacity, TextInput, StyleSheet, Image, FlatList } from 'react-native';
import { Button, MD3DarkTheme } from "react-native-paper";

import * as FileSystem from 'expo-file-system';

function getFileURIsFromDirectory(directoryUri: string): Array<FileSystem.File> {
  const dir = new FileSystem.Directory(directoryUri);
  if(!dir.exists){
    return [];
  }else{
    return dir.list() as Array<FileSystem.File>;
  }
}


export default function Album(){
  const [images, setImages] = useState<Array<FileSystem.File>>([]);
  const [visible, setVisible] = useState(false);
  const [year, setYear] = useState('');
  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');

  const checkDir = ()=>{
    const documentDir = FileSystem.Paths.document.uri + "photoScans/";
    setImages(getFileURIsFromDirectory(documentDir));
  }

  useEffect(()=>{

  },[]);

  const selectDate = () => {
    const y = parseInt(year);
    const m = parseInt(month);
    const d = parseInt(day);
    
    if (y && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      const date = new Date(y, m - 1, d);
      setSelected(date);
      setVisible(false);
      setYear('');
      setMonth('');
      setDay('');
    }
  };

  return <View style={{width:"100%", height:"100%",backgroundColor:"#121222ff", paddingTop:30}}>
    <FlatList 
      data={images}
      numColumns={3}
      renderItem={({item})=>(
        <Image source={{uri:item.uri}} style={{width:'33.33%', aspectRatio:1}}/>
      )}
    />

    <View style={{position:"absolute", bottom:10, right:10}}>
      <Button icon="filter" mode="contained-tonal" theme={MD3DarkTheme} onPress={checkDir}>
        Check
      </Button>
      <Button icon="filter" mode="contained-tonal" theme={MD3DarkTheme} onPress={() => setVisible(true)}>
        Filtrar
      </Button>
    </View>

          <Modal visible={visible} transparent animationType="fade">
            <View style={styles.overlay}>
              <View style={styles.modal}>
                <Text style={styles.title}>Filtrar</Text>
                <Text style={styles.title}>Selecciona una fecha</Text>
    
                <View style={styles.inputRow}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Año</Text>
                    <TextInput
                      style={[styles.input, styles.yearInput]}
                      value={year}
                      onChangeText={setYear}
                      placeholder="YYYY"
                      keyboardType="numeric"
                      maxLength={4}
                    />
                  </View>
    
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Mes</Text>
                    <TextInput
                      style={styles.input}
                      value={month}
                      onChangeText={setMonth}
                      placeholder="MM"
                      keyboardType="numeric"
                      maxLength={2}
                    />
                  </View>
    
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Día</Text>
                    <TextInput
                      style={styles.input}
                      value={day}
                      onChangeText={setDay}
                      placeholder="DD"
                      keyboardType="numeric"
                      maxLength={2}
                    />
                  </View>
    
                </View>
    
                <View style={styles.buttonRow}>
                  <TouchableOpacity style={styles.cancelButton} onPress={() => setVisible(false)}>
                    <Text style={styles.cancelText}>Cancelar</Text>
                  </TouchableOpacity>
    
                  <TouchableOpacity style={styles.confirmButton} onPress={selectDate}>
                    <Text style={styles.confirmText}>Filtrar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

  </View>
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' },
  button: { backgroundColor: '#007AFF', padding: 15, borderRadius: 8 },
  buttonText: { color: '#fff', fontSize: 16 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modal: { backgroundColor: '#fff', borderRadius: 12, padding: 24, width: 320 },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  inputRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  inputGroup: { flex: 1, marginHorizontal: 4 },
  label: { fontSize: 12, color: '#666', marginBottom: 6, fontWeight: '600' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, fontSize: 16, textAlign: 'center' },
  yearInput: { flex: 1.2 },
  buttonRow: { flexDirection: 'row', gap: 10 },
  cancelButton: { flex: 1, padding: 14, backgroundColor: '#f0f0f0', borderRadius: 8, alignItems: 'center' },
  cancelText: { fontSize: 16, color: '#666', fontWeight: '600' },
  confirmButton: { flex: 1, padding: 14, backgroundColor: '#007AFF', borderRadius: 8, alignItems: 'center' },
  confirmText: { fontSize: 16, color: '#fff', fontWeight: '600' }
});