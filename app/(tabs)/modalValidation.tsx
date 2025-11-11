import React, { useState } from 'react';
import { Modal, View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';

const FormModalExample = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState({});
  const validateForm = () => {
    let formErrors = {};
    if (!name) {
      formErrors.name = 'Name is required';
    }
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      formErrors.email = 'Valid email is required';
    }
    return formErrors;
  };
  const handleSubmit = () => {
    const formErrors = validateForm();
    if (Object.keys(formErrors).length === 0) {
      Alert.alert('Form Submitted!', `Name: ${name}, Email: ${email}`);
      setModalVisible(false); // Close modal on success
      setName('');
      setEmail('');
      setErrors({});
    } else {
      setErrors(formErrors);
    }
  };
  return (
    <View style={styles.container}>
      <Button title="Open Form Modal" onPress={() => setModalVisible(true)} />
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalBackground}>
          <View style={styles.modalContent}>
            <Text style={styles.title}>Fill out the form</Text>
            <TextInput
              style={styles.input}
              placeholder="Name"
              value={name}
              onChangeText={setName}
            />
            {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
            />
            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
            <Button title="Submit" onPress={handleSubmit} />
            <Button title="Close" onPress={() => setModalVisible(false)} color="red" />
          </View>
        </View>
      </Modal>
    </View>
  );
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackground: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: 300,
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 10,
  },
  title: {
    fontSize: 18,
    marginBottom: 10,
  },
  input: {
    borderBottomWidth: 1,
    marginBottom: 10,
    padding: 8,
  },
  errorText: {
    color: 'red',
    marginBottom: 10,
  },
});
export default FormModalExample;