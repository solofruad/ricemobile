import React, { useState } from "react";
import { Button, Text, View, Modal, StyleSheet, Image } from "react-native";

const CustomModal = () => {
  const [isModalVisible, setModalVisible] = useState(false);

  const toggleModal = () => {
    setModalVisible(!isModalVisible);
  };

  return (
    <View style={styles.container}>
      <Button title="Open Custom Modal" onPress={toggleModal} />

      <Modal
        animationType="fade"
        transparent={true}
        visible={isModalVisible}
        onRequestClose={toggleModal}
      >
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <Image
              source={{ uri: "https://via.placeholder.com/150" }}
              style={styles.modalImage}
            />
            <Text style={styles.modalTitle}>Welcome!</Text>
            <Text style={styles.modalDescription}>
              This is a custom modal with an image and more detailed content.
            </Text>
            <Button title="Close" onPress={toggleModal} />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
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
  modalImage: {
    width: 100,
    height: 100,
    marginBottom: 15,
    borderRadius: 50,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
  },
  modalDescription: {
    textAlign: "center",
    marginBottom: 20,
  },
});

export default CustomModal;