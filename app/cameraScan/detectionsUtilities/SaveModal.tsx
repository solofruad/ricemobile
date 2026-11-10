import { useEffect } from "react";
import { Modal, View, Text, StyleSheet } from "react-native";
import AppButton from "@/components/ui/app-button";

type SaveModalProps = {
  isModalVisible:boolean,
  setIsModalVisible:(value: boolean) => void
  goBackCamera:() => void
}

export default function SaveModal ({isModalVisible,setIsModalVisible,goBackCamera}: SaveModalProps){
  useEffect(() => {
    let timer: number;
    if (isModalVisible) {
      timer = setTimeout(() => {
        setIsModalVisible(false);
      }, 3500);
    }
    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [isModalVisible]);

  return <Modal
            animationType="fade"
            transparent={true}
            visible={isModalVisible}
            onRequestClose={() => {
              setIsModalVisible(false);
            }}
          >
            <View style={styles.centeredView}>
              <View style={styles.modalView}>
                <Text style={styles.modalText}>El resultado del escaneo ha sido guardado.</Text>
                <AppButton title="Cerrar" onPress={() => {setIsModalVisible(false); goBackCamera();}} />
              </View>
            </View>
          </Modal>;
}

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Backdrop effect
  },
  modalView: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 35,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalText: {
    marginBottom: 15,
    textAlign: 'center',
  },
});