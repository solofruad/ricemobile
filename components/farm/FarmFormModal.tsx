import React, { useMemo, useState } from "react";
import { View, Modal, Text, TextInput, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { Menu } from "react-native-paper";
import AppButton from "@/components/ui/app-button";
import { COLOMBIA_LOCATIONS } from "@/constants/colombia-locations";
import { saveFarmFormResponse } from "@/services/farm-form";

type FarmFormModalProps = {
  visible: boolean;
  onClose: () => void;
};

type Step = "intro" | "form";

const FarmFormModal = (props: FarmFormModalProps) => {
  const [step, setStep] = useState<Step>("intro");
  const [hectareas, setHectareas] = useState("");
  const [departamento, setDepartamento] = useState<string | null>(null);
  const [municipio, setMunicipio] = useState<string | null>(null);
  const [deptMenuVisible, setDeptMenuVisible] = useState(false);
  const [munMenuVisible, setMunMenuVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const municipios = useMemo(
    () => COLOMBIA_LOCATIONS.find(l => l.departamento === departamento)?.municipios ?? [],
    [departamento],
  );

  const resetForm = () => {
    setHectareas("");
    setDepartamento(null);
    setMunicipio(null);
    setError(null);
    setStep("intro");
  };

  const handleOmitir = () => {
    resetForm();
    props.onClose();
  };

  const handleGuardar = async () => {
    const parsedHectareas = parseFloat(hectareas.replace(",", "."));
    if (hectareas.trim() === "" || isNaN(parsedHectareas) || parsedHectareas <= 0) {
      setError("Ingresa una extensión válida en hectáreas.");
      return;
    }
    if (!departamento) {
      setError("Selecciona el departamento.");
      return;
    }
    if (!municipio) {
      setError("Selecciona el municipio más cercano.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await saveFarmFormResponse({
        hectareas: parsedHectareas,
        departamento,
        municipio,
      });
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
            style={{ flexGrow: 0 }}
          >
            <View style={styles.modalView}>
              <Text style={styles.title}>INFORMACIÓN DE TU FINCA</Text>

              <Text style={styles.label}>Extensión de la finca (hectáreas, aproximado)</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej. 4.5"
                placeholderTextColor="#9aa5b1"
                keyboardType="decimal-pad"
                value={hectareas}
                onChangeText={setHectareas}
              />

              <Text style={styles.label}>Departamento</Text>
              <Menu
                visible={deptMenuVisible}
                onDismiss={() => setDeptMenuVisible(false)}
                anchor={
                  <AppButton
                    title={departamento ?? "Selecciona un departamento"}
                    onPress={() => setDeptMenuVisible(true)}
                    color={departamento ? "#5189d2" : "#8a94a6"}
                  />
                }
                contentStyle={styles.menuContent}
              >
                <ScrollView style={styles.menuScroll} keyboardShouldPersistTaps="handled">
                  {COLOMBIA_LOCATIONS.map(loc => (
                    <Menu.Item
                      key={loc.departamento}
                      title={loc.departamento}
                      onPress={() => {
                        setDepartamento(loc.departamento);
                        setMunicipio(null);
                        setDeptMenuVisible(false);
                      }}
                    />
                  ))}
                </ScrollView>
              </Menu>

              <Text style={styles.label}>Municipio más cercano</Text>
              <Menu
                visible={munMenuVisible}
                onDismiss={() => setMunMenuVisible(false)}
                anchor={
                  <AppButton
                    title={municipio ?? (departamento ? "Selecciona un municipio" : "Selecciona primero un departamento")}
                    onPress={() => departamento && setMunMenuVisible(true)}
                    color={municipio ? "#5189d2" : "#8a94a6"}
                    disabled={!departamento}
                  />
                }
                contentStyle={styles.menuContent}
              >
                <ScrollView style={styles.menuScroll} keyboardShouldPersistTaps="handled">
                  {municipios.map(mun => (
                    <Menu.Item
                      key={mun}
                      title={mun}
                      onPress={() => {
                        setMunicipio(mun);
                        setMunMenuVisible(false);
                      }}
                    />
                  ))}
                </ScrollView>
              </Menu>

              {error && <Text style={styles.error}>{error}</Text>}

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
  },
  modalView: {
    backgroundColor: "white",
    borderRadius: 10,
    padding: 20,
    alignItems: "stretch",
    width: "85%",
    maxHeight: "85%",
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
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2C3E50",
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: "#cfd8e0",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: "#2C3E50",
    backgroundColor: "#f7f9fb",
  },
  error: {
    color: "#c0392b",
    fontSize: 14,
    textAlign: "center",
    marginTop: 10,
  },
  botonera: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginTop: 16,
  },
  menuContent: {
    backgroundColor: "white",
  },
  menuScroll: {
    maxHeight: 260,
  },
});

export default FarmFormModal;
