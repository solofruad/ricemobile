import React from "react";
import { ScrollView, StyleSheet, Text, useColorScheme, View } from "react-native";
import EditorActionButton from "./EditorActionButton";
import { MD3Colors } from "react-native-paper";

/**
 * MonEditQuickRef - Referencia Rápida para MonEdit
 * 
 * Este componente proporciona un resumen visual rápido de los
 * controles y funciones principales del editor de monitoreo.
 */

const QuickReference = () => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const styles = StyleSheet.create({
    container: {
      // flex: 1,
      // backgroundColor: isDark ? "#1e1e1e" : "#ffffff",
      // padding: 16
    },
    title: {
      fontSize: 20,
      fontWeight: "bold",
      color: isDark ? "#ffffff" : "#000000",
      marginBottom: 16,
      textAlign: "center",
    },
    section: {
      marginBottom: 24,
      backgroundColor: isDark ? "#2a2a2a" : "#f5f5f5",
      borderRadius: 8,
      padding: 12,
      borderLeftWidth: 4,
      borderLeftColor: "#2196F3",
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: "bold",
      color: isDark ? "#64b5f6" : "#1976d2",
      marginBottom: 10,
    },
    item: {
      marginBottom: 8,
      paddingVertical: 4,
    },
    itemText: {
      fontSize: 13,
      color: isDark ? "#e0e0e0" : "#333333",
      lineHeight: 20,
    },
    key: {
      fontWeight: "600",
      color: isDark ? "#ffb74d" : "#f57c00",
    },
    modeSection: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 8,
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? "#444" : "#e0e0e0",
    },
    modeName: {
      flex: 1,
      fontWeight: "bold",
      color: isDark ? "#ffffff" : "#000000",
      fontSize: 12,
    },
    modeDesc: {
      flex: 2,
      fontSize: 11,
      color: isDark ? "#c0c0c0" : "#666666",
    },
    table: {
      marginTop: 8,
    },
    tableHeader: {
      flexDirection: "row",
      backgroundColor: isDark ? "#333333" : "#e0e0e0",
      paddingVertical: 8,
      paddingHorizontal: 6,
      borderRadius: 4,
      marginBottom: 4,
    },
    tableRow: {
      flexDirection: "row",
      paddingVertical: 6,
      paddingHorizontal: 6,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? "#444" : "#f0f0f0",
    },
    tableCell: {
      flex: 1,
      fontSize: 11,
      color: isDark ? "#e0e0e0" : "#333333",
    },
    warning: {
      backgroundColor: isDark ? "#4a3d1a" : "#fff3cd",
      borderLeftColor: "#ffc107",
    },
    success: {
      backgroundColor: isDark ? "#1b4d2e" : "#d4edda",
      borderLeftColor: "#28a745",
    },
    danger: {
      backgroundColor: isDark ? "#4a1a1a" : "#f8d7da",
      borderLeftColor: "#dc3545",
    },
    code: {
      fontFamily: "monospace",
      fontSize: 12,
      backgroundColor: isDark ? "#1e1e1e" : "#f0f0f0",
      paddingHorizontal: 4,
      paddingVertical: 2,
      borderRadius: 3,
      color: isDark ? "#4ecdc4" : "#d63384",
    },
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>⚡ Referencia Rápida MonEdit</Text>

      {/* Modos */}
      <View style={[styles.section, styles.warning]}>
        <Text style={styles.sectionTitle}>🎮 Modos de Operación</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableCell, { fontWeight: "bold" }]}>Modo</Text>
            <Text style={[styles.tableCell, { fontWeight: "bold" }]}>Acción</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCell}>✏️ EDITAR</Text>
            <Text style={styles.tableCell}>Arrastra o crear puntos (por defecto)</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCell}>🗑️ ELIMINAR</Text>
            <Text style={styles.tableCell}>Toca para eliminar punto</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCell}>🔒 BLOQUEAR</Text>
            <Text style={styles.tableCell}>Protege puntos de cambios</Text>
          </View>
        </View>
      </View>

      {/* Gestos */}
      <View style={[styles.section, styles.success]}>
        <Text style={styles.sectionTitle}>👆 Gestos Disponibles</Text>
        <View style={styles.item}>
          <Text style={styles.itemText}>
            <Text style={styles.key}>Arrastrar:</Text> Mueve un punto seleccionado
          </Text>
        </View>
        <View style={styles.item}>
          <Text style={styles.itemText}>
            <Text style={styles.key}>Tocar:</Text> Agrega punto (EDITAR) o elimina (ELIMINAR)
          </Text>
        </View>
        <View style={styles.item}>
          <Text style={styles.itemText}>
            <Text style={styles.key}>Toque largo:</Text> Selecciona un punto para edición
          </Text>
        </View>
      </View>

      {/* Botones */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔘 Botones de Control</Text>
        <View style={styles.item}>
          <Text style={styles.itemText}>
            <Text style={styles.key}>❌ Undo:</Text> Revierte última acción
          </Text>
        </View>
        <View style={styles.item}>
          <Text style={styles.itemText}>
            <Text style={styles.key}>🔄 Restart:</Text> Reinicia trazado a valores por defecto
          </Text>
        </View>
        <View style={styles.item}>
          <Text style={styles.itemText}>
            <Text style={styles.key}>✏️ Edit:</Text> Activa modo editar
          </Text>
        </View>
        <View style={styles.item}>
          <Text style={styles.itemText}>
            <Text style={styles.key}>📦 Influence:</Text> Visualiza áreas de influencia
          </Text>
        </View>
        <View style={styles.item}>
          <Text style={styles.itemText}>
            <Text style={styles.key}>🗑️ Delete:</Text> Activa modo eliminar
          </Text>
        </View>
        <View style={styles.item}>
          <Text style={styles.itemText}>
            <Text style={styles.key}>🔒 Lock:</Text> Activa modo bloquear
          </Text>
        </View>
        <View style={styles.item}>
          <Text style={styles.itemText}>
            <Text style={styles.key}>❓ Help:</Text> Abre esta guía
          </Text>
        </View>
      </View>

      {/* Restricciones */}
      <View style={[styles.section, styles.danger]}>
        <Text style={styles.sectionTitle}>⚠️ Restricciones Importantes</Text>
        <View style={styles.item}>
          <Text style={styles.itemText}>
            ❌ No puedes mover puntos fuera del área principal
          </Text>
        </View>
        <View style={styles.item}>
          <Text style={styles.itemText}>
            ❌ La ruta W debe estar dentro del polígono límite
          </Text>
        </View>
        <View style={styles.item}>
          <Text style={styles.itemText}>
            ❌ Mínimo 3 puntos para un polígono válido
          </Text>
        </View>
        <View style={styles.item}>
          <Text style={styles.itemText}>
            ❌ No puedes editar puntos bloqueados
          </Text>
        </View>
      </View>

      {/* Tips */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>💡 Consejos Prácticos</Text>
        <View style={styles.item}>
          <Text style={styles.itemText}>
            1. Comienza con formas simples antes de complejidades
          </Text>
        </View>
        <View style={styles.item}>
          <Text style={styles.itemText}>
            2. Usa bloqueos en puntos importantes
          </Text>
        </View>
        <View style={styles.item}>
          <Text style={styles.itemText}>
            3. Visualiza influencia para verificar cobertura
          </Text>
        </View>
        <View style={styles.item}>
          <Text style={styles.itemText}>
            4. Si ves vibración = movimiento inválido
          </Text>
        </View>
        <View style={styles.item}>
          <Text style={styles.itemText}>
            5. Deshacer (Undo) es tu mejor amigo
          </Text>
        </View>
      </View>

      {/* Estados */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📊 Indicadores de Estado</Text>
        <View style={styles.item}>
          <Text style={styles.itemText}>
            <Text style={styles.key}>Botón Verde:</Text> Modo activo
          </Text>
        </View>
        <View style={styles.item}>
          <Text style={styles.itemText}>
            <Text style={styles.key}>Botón Gris:</Text> Modo inactivo
          </Text>
        </View>
        <View style={styles.item}>
          <Text style={styles.itemText}>
            <Text style={styles.key}>Vibración:</Text> Acción rechazada/inválida
          </Text>
        </View>
        <View style={styles.item}>
          <Text style={styles.itemText}>
            <Text style={styles.key}>Toast (popup):</Text> Mensajes de estado
          </Text>
        </View>
      </View>

      {/* Atajo */}
      <View style={[styles.section, styles.success]}>
        <Text style={styles.sectionTitle}>🚀 Flujo Rápido</Text>
        <Text style={styles.itemText}>
          1️⃣ Modo EDITAR → 2️⃣ Arrastra puntos → 3️⃣ Deshacer si necesitas → 4️⃣ Guarda
        </Text>
      </View>
    </View>
  );
};

export default QuickReference;
