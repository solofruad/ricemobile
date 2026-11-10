import React, { useState } from "react";
import { View, Modal, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { Provider as PaperProvider } from "react-native-paper";
import AppButton from "@/components/ui/app-button";
import FarmFormFields from "@/components/farm/FarmFormFields";
import { useFarmFormState } from "@/hooks/use-farm-form-state";
import { buildFarmFormPayload, saveFarmFormResponse } from "@/services/farm-form";

type FarmFormModalProps = {
  visible: boolean;
  onClose: () => void;
};

type Step = "intro" | "form";

const FarmFormModal = (props: FarmFormModalProps) => {
  const [step, setStep] = useState<Step>("intro");
  const { values, patch, reset } = useFarmFormState();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    reset();
    setError(null);
    setStep("intro");
  };

  const handleOmitir = () => {
    resetForm();
    props.onClose();
  };

  const handleGuardar = async () => {
    const result = buildFarmFormPayload(values);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await saveFarmFormResponse(result.payload);
      resetForm();
      props.onClose();
    } catch (err) {
      console.log("Error guardando información de la finca", err);
      setError("No se pudo guardar la información. Inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={props.visible}
      onRequestClose={handleOmitir}
    >
      <PaperProvider>
        <KeyboardAvoidingView
          style={styles.centeredView}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
        {step === "intro" ? (
          <View style={styles.modalView}>
            <Text style={styles.title}>ANTES DE CONTINUAR...</Text>
            <Text style={styles.description}>
              Queremos conocerte mejor. Ayúdanos respondiendo 3 preguntas muy
              breves sobre tu finca. La información recolectada será usada
              únicamente con fines de análisis e investigación académicos.
            </Text>
            <View style={styles.botonera}>
              <AppButton
                title="Omitir por ahora"
                onPress={handleOmitir}
                color="#8a94a6"
              />
              <AppButton title="Aceptar e iniciar" onPress={() => setStep("form")} />
            </View>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            style={{ flex: 1, width: "100%" }}
          >
            <View style={styles.modalView}>
              <Text style={styles.title}>INFORMACIÓN DE TU FINCA</Text>

              <FarmFormFields values={values} onChange={patch} error={error} />

              <View style={styles.botonera}>
                <AppButton
                  title="Cancelar"
                  onPress={handleOmitir}
                  color="#8a94a6"
                />
                <AppButton
                  title={saving ? "Guardando..." : "Guardar"}
                  onPress={handleGuardar}
                  disabled={saving}
                />
              </View>
            </View>
          </ScrollView>
        )}
        </KeyboardAvoidingView>
      </PaperProvider>
    </Modal>
  );
};

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
  },
  scrollContent: {
    justifyContent: "center",
    alignItems: "center",
    flexGrow: 1,
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  modalView: {
    backgroundColor: "white",
    borderRadius: 10,
    padding: 20,
    alignItems: "stretch",
    width: "85%",
    maxWidth: 480,
    flexShrink: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#2C3E50",
    textAlign: "center",
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: "#5A6C7D",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 24,
  },
  botonera: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    gap: 8,
    marginTop: 16,
  },
});

export default FarmFormModal;
