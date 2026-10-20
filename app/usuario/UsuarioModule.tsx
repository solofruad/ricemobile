import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import AppButton from "@/components/ui/app-button";
import FarmFormFields, { EMPTY_FARM_FORM_VALUES, type FarmFormValues } from "@/components/farm/FarmFormFields";
import { useFarmFormState } from "@/hooks/use-farm-form-state";
import FarmFormTable from "@/database/tables/FarmFormTable";
import { buildFarmFormPayload, saveFarmFormResponse } from "@/services/farm-form";

export default function UsuarioModule() {
  const [loading, setLoading] = useState(true);
  const [hasRecord, setHasRecord] = useState(false);
  const [syncInfo, setSyncInfo] = useState<{ uploaded: boolean; remote_id: number | null } | null>(null);
  const [snapshot, setSnapshot] = useState<FarmFormValues>(EMPTY_FARM_FORM_VALUES);

  const { values, patch, applyRecord } = useFarmFormState();

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadForm = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const form = await FarmFormTable.getForm();
      applyRecord(form);
      setSnapshot({
        nombreFinca: form?.nombre_finca ?? "",
        hectareas: form?.hectareas != null ? String(form.hectareas) : "",
        departamento: form?.departamento ?? null,
        municipio: form?.municipio ?? null,
        vereda: form?.vereda ?? "",
        autorizaUsoMuestras: form?.autoriza_uso_muestras == null ? null : !!form.autoriza_uso_muestras,
      });
      setHasRecord(!!(form && (form.hectareas != null || form.departamento || form.municipio || form.nombre_finca)));
      setSyncInfo(form ? { uploaded: !!form.uploaded, remote_id: form.remote_id ?? null } : null);
    } catch (err) {
      console.log("Error leyendo información del agricultor", err);
      setError("No se pudo cargar la información guardada.");
    } finally {
      setLoading(false);
    }
  }, [applyRecord]);

  useFocusEffect(
    useCallback(() => {
      loadForm();
    }, [loadForm]),
  );

  const isDirty =
    values.nombreFinca !== snapshot.nombreFinca ||
    values.hectareas !== snapshot.hectareas ||
    values.departamento !== snapshot.departamento ||
    values.municipio !== snapshot.municipio ||
    values.vereda !== snapshot.vereda ||
    values.autorizaUsoMuestras !== snapshot.autorizaUsoMuestras;

  const handleDescartar = () => {
    patch({ ...snapshot });
    setError(null);
    setSuccess(null);
  };

  const handleGuardar = async () => {
    const result = buildFarmFormPayload(values);
    if ("error" in result) {
      setError(result.error);
      setSuccess(null);
      return;
    }
    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      // Solo local por ahora: no se actualiza el backend aunque ya exista remote_id.
      await saveFarmFormResponse(result.payload);
      await loadForm();
      setSuccess("Información actualizada en este dispositivo.");
    } catch (err) {
      console.log("Error guardando información del agricultor", err);
      setError("No se pudo guardar la información. Inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <View style={styles.content}>
      <View style={styles.header}>
        <Text style={styles.subtitle}>
          Consulta y modifica la información recolectada sobre tu finca. Los cambios se guardan en este dispositivo.
        </Text>
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          {loading ? (
            <Text style={styles.muted}>Cargando información...</Text>
          ) : (
            <>
              {!hasRecord && (
                <Text style={styles.info}>
                  Aún no hay información registrada. Completa el formulario y guárdala.
                </Text>
              )}
              {syncInfo && hasRecord && (
                <Text style={styles.muted}>
                  Estado: {syncInfo.uploaded ? "Sincronizado con el servidor" : "Guardado local (pendiente de sincronización)"}
                  {/* {syncInfo.remote_id != null ? ` · Finca #${syncInfo.remote_id}` : ""} */}
                </Text>
              )}
              {/* {hasRecord && (
                <Text style={styles.muted}>
                  Autorización de muestras: {snapshot.autorizaUsoMuestras == null ? "Sin responder" : snapshot.autorizaUsoMuestras ? "Sí" : "No"}
                </Text>
              )} */}

              <FarmFormFields values={values} onChange={patch} error={error} />
              {success && <Text style={styles.success}>{success}</Text>}

              <View style={styles.botonera}>
                <AppButton
                  title={saving ? "Guardando..." : "Guardar cambios"}
                  onPress={handleGuardar}
                  disabled={saving || loading}
                />
                <AppButton
                  title="Descartar cambios"
                  onPress={handleDescartar}
                  color="#8a94a6"
                  disabled={saving || loading || !isDirty}
                />
              </View>
            </>
          )}
        </View>
      </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // Franja del inset superior en negro (igual que Monitoreo/Chatbot):
    // los iconos del sistema (claros, StatusBar global auto) se dibujan sobre ella.
    backgroundColor: "black",
  },
  content: {
    flex: 1,
    flexDirection: "column",
    backgroundColor: "#fffbf0",
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 16,
    flexGrow: 1,
  },
  subtitle: {
    fontSize: 19,
    color: "#5A6C7D",
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 20,
  },
  card: {
    backgroundColor: "white",
    borderRadius: 10,
    padding: 16,
  },
  success: {
    color: "#1e7e34",
    fontSize: 14,
    textAlign: "center",
    marginTop: 10,
  },
  info: {
    color: "#5A6C7D",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 8,
  },
  muted: {
    color: "#5A6C7D",
    fontSize: 13,
    textAlign: "center",
    marginBottom: 8,
  },
  botonera: {
    flexDirection: "column",
    gap: 8,
    marginTop: 16,
  },
});
