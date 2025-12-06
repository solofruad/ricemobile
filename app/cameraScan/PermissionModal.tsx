import React, { useEffect, useState } from "react";
import { Button, View, Modal, Linking, Alert, Text, StyleSheet } from "react-native";

type PermissionModalProps = {
  visible:boolean
}

const PermissionModal = (props:PermissionModalProps) => {
  const [isModalVisible, setModalVisible] = useState(false);

  const toggleModal = () => {
    setModalVisible(!isModalVisible);
  };

  useEffect(()=>{
    setModalVisible(true);
  },[props.visible])



  const openSettings = async () => {
    try {
      await Linking.openSettings();
    } catch (error) {
      Alert.alert(
        'Error',
        'No se pudo abrir la aplicación de Ajustes. Porfavor abre la aplicación de ajustes de tu dispositivo y habilita el permiso de camara para la aplicación.'
      );
    }
  };

  return (
      <Modal
        animationType="fade"
        transparent={true}
        visible={isModalVisible}
        onRequestClose={toggleModal}
      >
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <Text style={styles.title}>Permiso de acceso a Camara</Text>
                  
            <Text style={styles.description}>
              Esta aplicación requiere el uso de la camara del dispositivo para funcionar.
              Porfavor habilite el permiso de uso de la camara en los Ajustes del dispositivo.
            </Text>
            <View style={styles.botonera}>
              <Button 
                title="Ir a Ajustes" 
                onPress={openSettings}
              />
              <Button title="Cerrar" onPress={toggleModal} />
            </View>
          </View>
        </View>
      </Modal>
  );
};

const styles = StyleSheet.create({
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: '#5A6C7D',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
  },
  modalView: {
    backgroundColor: "white",
    borderRadius: 10,
    padding: 20,
    alignItems: "center",
    width: "80%",
  },
  botonera:{
    display:"flex",
    gap:8
  }
});

export default PermissionModal;