import React, { useMemo, useState } from "react";
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { Checkbox, Icon, Menu } from "react-native-paper";
import { COLOMBIA_LOCATIONS } from "@/constants/colombia-locations";

export type FarmFormValues = {
  nombreFinca: string;
  hectareas: string;
  departamento: string | null;
  municipio: string | null;
  vereda: string;
  autorizaUsoMuestras: boolean | null;
};

export const EMPTY_FARM_FORM_VALUES: FarmFormValues = {
  nombreFinca: "",
  hectareas: "",
  departamento: null,
  municipio: null,
  vereda: "",
  autorizaUsoMuestras: null,
};

type FarmFormFieldsProps = {
  values: FarmFormValues;
  onChange: (patch: Partial<FarmFormValues>) => void;
  error?: string | null;
};

// Campos del formulario de la finca (presentacional y controlado).
// Reutilizado por el modal inicial (FarmFormModal) y la pestaña Usuario.
// No guarda nada: el contenedor dueño valida y persiste.
export default function FarmFormFields(props: FarmFormFieldsProps) {
  const { values, onChange, error } = props;
  const [deptMenuVisible, setDeptMenuVisible] = useState(false);
  const [munMenuVisible, setMunMenuVisible] = useState(false);

  const municipios = useMemo(
    () => COLOMBIA_LOCATIONS.find(l => l.departamento === values.departamento)?.municipios ?? [],
    [values.departamento],
  );

  return (
    <View>
      <Text style={styles.label}>Nombre de la finca (opcional)</Text>
      <TextInput
        style={styles.input}
        placeholder="Ej. Finca La Esperanza"
        placeholderTextColor="#9aa5b1"
        autoCapitalize="sentences"
        value={values.nombreFinca}
        onChangeText={nombreFinca => onChange({ nombreFinca })}
      />

      <Text style={styles.label}>Extensión de la finca (hectáreas, aproximado)</Text>
      <TextInput
        style={styles.input}
        placeholder="Ej. 4.5"
        placeholderTextColor="#9aa5b1"
        keyboardType="decimal-pad"
        value={values.hectareas}
        onChangeText={hectareas => onChange({ hectareas })}
      />

      <Text style={styles.label}>Departamento</Text>
      <Menu
        visible={deptMenuVisible}
        onDismiss={() => setDeptMenuVisible(false)}
        anchor={
          <TouchableOpacity
            onPress={() => setDeptMenuVisible(true)}
            style={styles.selector}
          >
            <Text
              style={[styles.selectorText, values.departamento && styles.selectorTextSelected]}
              numberOfLines={1}
            >
              {values.departamento ?? "Selecciona un departamento"}
            </Text>
            <Icon source="menu-down" size={22} color="#2C3E50" />
          </TouchableOpacity>
        }
        contentStyle={styles.menuContent}
      >
        <ScrollView style={styles.menuScroll} keyboardShouldPersistTaps="handled">
          {COLOMBIA_LOCATIONS.map(loc => (
            <Menu.Item
              key={loc.departamento}
              title={loc.departamento}
              onPress={() => {
                // Al cambiar de departamento el municipio deja de ser válido;
                // la vereda (texto libre) se conserva.
                onChange({ departamento: loc.departamento, municipio: null });
                setDeptMenuVisible(false);
              }}
              trailingIcon={values.departamento === loc.departamento ? "check" : undefined}
              titleStyle={styles.menuItemTitle}
              style={styles.menuItem}
            />
          ))}
        </ScrollView>
      </Menu>

      <Text style={styles.label}>Municipio más cercano</Text>
      <Menu
        visible={munMenuVisible}
        onDismiss={() => setMunMenuVisible(false)}
        anchor={
          <TouchableOpacity
            onPress={() => values.departamento && setMunMenuVisible(true)}
            disabled={!values.departamento}
            style={[styles.selector, !values.departamento && styles.selectorDisabled]}
          >
            <Text
              style={[
                styles.selectorText,
                values.municipio && styles.selectorTextSelected,
                !values.departamento && styles.selectorTextDisabled,
              ]}
              numberOfLines={1}
            >
              {values.municipio ?? (values.departamento ? "Selecciona un municipio" : "Selecciona primero un departamento")}
            </Text>
            <Icon source="menu-down" size={22} color="#2C3E50" />
          </TouchableOpacity>
        }
        contentStyle={styles.menuContent}
      >
        <ScrollView style={styles.menuScroll} keyboardShouldPersistTaps="handled">
          {municipios.map(mun => (
            <Menu.Item
              key={mun}
              title={mun}
              onPress={() => {
                onChange({ municipio: mun });
                setMunMenuVisible(false);
              }}
              trailingIcon={values.municipio === mun ? "check" : undefined}
              titleStyle={styles.menuItemTitle}
              style={styles.menuItem}
            />
          ))}
        </ScrollView>
      </Menu>

      <Text style={styles.label}>Vereda (opcional)</Text>
      <TextInput
        style={styles.input}
        placeholder="Ej. Vereda El Roble"
        placeholderTextColor="#9aa5b1"
        autoCapitalize="sentences"
        value={values.vereda}
        onChangeText={vereda => onChange({ vereda })}
      />

      <Text style={styles.label}>Uso de las muestras (obligatorio)</Text>
      <TouchableOpacity
        style={styles.consentRow}
        onPress={() => onChange({ autorizaUsoMuestras: !(values.autorizaUsoMuestras ?? false) })}
        activeOpacity={0.7}
      >
        <Checkbox
          status={values.autorizaUsoMuestras == null ? "indeterminate" : values.autorizaUsoMuestras ? "checked" : "unchecked"}
          onPress={() => onChange({ autorizaUsoMuestras: !(values.autorizaUsoMuestras ?? false) })}
          color="#5189d2"
        />
        <Text style={styles.consentText}>
          Autorizo que las tomas de muestras de mis monitoreos sean usadas con fines de análisis e investigación académicos.
        </Text>
      </TouchableOpacity>

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
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
  consentRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#f7f9fb",
    borderWidth: 1,
    borderColor: "#cfd8e0",
    borderRadius: 8,
    padding: 8,
  },
  consentText: {
    flex: 1,
    flexShrink: 1,
    fontSize: 14,
    color: "#2C3E50",
    lineHeight: 20,
    marginLeft: 4,
  },
  menuContent: {
    backgroundColor: "white",
  },
  menuScroll: {
    maxHeight: 260,
  },
  menuItem: {
    minHeight: 40,
  },
  menuItemTitle: {
    color: "#2C3E50",
    fontSize: 14,
  },
  selector: {
    backgroundColor: "#f7f9fb",
    borderWidth: 1,
    borderColor: "#cfd8e0",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectorDisabled: {
    opacity: 0.5,
  },
  selectorText: {
    fontSize: 16,
    color: "#9aa5b1",
    flexShrink: 1,
  },
  selectorTextSelected: {
    color: "#2C3E50",
    fontWeight: "600",
  },
  selectorTextDisabled: {
    color: "#9aa5b1",
  },
});
