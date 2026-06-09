import Ionicons from "@expo/vector-icons/Ionicons";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, useColorScheme, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { EnrichedMarkdownText } from "react-native-enriched-markdown";
import QuickReference from "./MonEditQuickRef";

const GUIDE_CONTENT = `# 📍 Guía de Uso - Editor de Monitoreo

## ¡Bienvenido!

El **Editor de Monitoreo** te permite crear y personalizar áreas de vigilancia para tu cultivo de arroz. Esta guía te mostrará cómo usar todas las funciones disponibles.

---

## 🎯 Conceptos Básicos

### ¿Qué es el Área de Monitoreo?

El editor te permite definir dos elementos principales:

1. **Polígono de Límite** (Área Principal)
   - Define el perímetro del área a monitorear
   - Forma una línea cerrada

2. **Ruta en W** (Patrón de Monitoreo)
   - Representa un patrón de recorrido dentro del área
   - Se usa para planificar muestreo o inspección
   - Debe estar completamente dentro del área principal

---

## 🖱️ Modos de Operación

### 1. Modo EDITAR (Por defecto)
Modifica la posición de los puntos del área.

**¿Cómo usar?**
- Toca y arrastra cualquier punto (circulito) para moverlo
- El punto se actualizará en tiempo real
- El sistema evitará movimientos inválidos con una vibración

### 2. Modo ELIMINAR
Elimina puntos del área.

**¿Cómo usar?**
- Cambia al modo "Eliminar"
- Toca el punto que deseas eliminar
- El punto desaparecerá del área

### 3. Modo BLOQUEAR
Protege puntos para evitar cambios accidentales.

**¿Cómo usar?**
- Cambia al modo "Bloquear"
- Toca el punto que deseas proteger
- El punto bloqueado no podrá ser movido

---

## 🎮 Controles Principales

### Botones de Acción

| Botón | Función |
| ------- | --------- |
| EDITAR | Activa modo para mover puntos |
| **ELIMINAR** | Activa modo para eliminar puntos |
| **BLOQUEAR** | Activa modo para proteger puntos |
| **DESHACER** | Revierte el último cambio realizado |
| **VER INFLUENCIA** | Visualiza el área de influencia de cada punto |

### Panel Editor

El panel lateral te muestra:
- Modo actual
- Número de puntos en el área
- Información del punto seleccionado

---

## 💡 Pasos para Crear tu Área de Monitoreo

### Paso 1: Define el Límite del Área
1. Entra en **Modo EDITAR**
2. Toca y arrastra los puntos de la frontera
3. Forma el perímetro deseado
4. Los puntos se conectarán automáticamente

### Paso 2: Crea la Ruta de Monitoreo
1. Enfócate en la ruta en W (línea roja)
2. Ajusta sus puntos dentro del área principal
3. Crea un patrón que cubra toda el área

### Paso 3: Valida tu Configuración
- ✅ El área de monitoreo es un polígono cerrado
- ✅ La ruta en W está completamente dentro del límite
- ✅ No hay superposiciones no deseadas

### Paso 4: Guarda tu Configuración
- Una vez satisfecho, guarda tu trabajo
- Puedes volver a editar en cualquier momento

---

## ⚠️ Restricciones Importantes

### ❌ Lo que NO puedes hacer:

- **Mover un punto fuera del área principal** → El sistema lo rechazará con una vibración
- **Mover la ruta en W fuera del límite** → La acción será revertida
- **Dejar el área sin puntos** → Necesitas al menos 3 puntos para un polígono válido
- **Editar puntos bloqueados** → Debes desbloquearlos primero

---

## 🔄 Deshacer y Rehacer

### Usando el Botón DESHACER
- Presiona **DESHACER** para revertir el último cambio
- Cada toque revierte una acción anterior
- Ideal para corregir errores rápidamente

---

## 👁️ Modo Visualización de Influencia

Cuando activas "VER INFLUENCIA":
- Se muestran círculos alrededor de cada punto
- El tamaño del círculo representa el área de influencia
- Útil para entender el alcance de cada punto

---

## 🛠️ Consejos Prácticos

### Para Mejores Resultados:

1. **Comienza Simple** → Empieza con un área rectangular, luego ajusta
2. **Sé Preciso** → Tómate tiempo para alinear puntos correctamente
3. **Usa Bloqueos** → Bloquea puntos importantes para evitar cambios accidentales
4. **Visualiza** → Usa el modo de influencia para verificar cobertura
5. **Revisa Frecuentemente** → Guarda cambios intermedios

### Errores Comunes a Evitar:

- ❌ Mover demasiado rápido sin revisar
- ❌ Olvidar que la ruta debe estar dentro del límite
- ❌ Usar muy pocos puntos (menos precisión)
- ❌ No guardar cambios antes de salir

---

## 📱 Gestos Disponibles

### En la Pantalla de Edición:

- **Toque largo** → Selecciona un punto
- **Arrastrar** → Mueve el punto seleccionado
- **Toque simple** → En modo Eliminar o Bloquear, realiza la acción
- **Doble toque** → (Reservado para funciones futuras)

---

## ❓ Preguntas Frecuentes

### ¿Puedo editar mi área después de guardarla?
**Sí**, puedes volver a abrir el editor en cualquier momento para hacer cambios.

### ¿Qué pasa si cometo un error?
Usa el botón **DESHACER** para revertir el cambio. Puedes deshacer múltiples acciones.

### ¿Cuántos puntos puedo usar?
Mínimo 3 puntos para un polígono válido. No hay límite máximo, pero más puntos = más precisión pero más lento.

### ¿La ruta en W es obligatoria?
Depende de tu flujo de trabajo. El editor permite editar ambas, pero solo necesitas lo que tu aplicación requiera.

### ¿Cómo sé si mi configuración es válida?
El sistema te lo indicará con vibración si intentas un movimiento inválido. Un área válida tendrá todos sus elementos en las posiciones correctas.

---

## 🎓 Próximos Pasos

Una vez domines el editor:
1. Crea tus primeras áreas de monitoreo
2. Guarda diferentes configuraciones
3. Experimenta con diferentes patrones de ruta
4. Usa la información para mejorar tus análisis

---

## 📞 Necesitas Ayuda?

Si encuentras problemas o tienes preguntas:
- Revisa esta guía nuevamente
- Intenta usar el botón DESHACER

---

**¡Éxito con tu monitoreo!** 🌾`;

interface GuideScreenProps {
  onClose?: () => void;
  isVisible?: boolean;
}

export default function MonGuide({ onClose, isVisible = true }: GuideScreenProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  if (!isVisible) return null;

  const styles = StyleSheet.create({
    container: {
      // flex: 1,
      backgroundColor: isDark ? "#252527" : "#fff9e5",
      width:"100%",
      height:"100%"
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: isDark ? "#2a2a2a" : "#f5f5f5",
      borderBottomWidth: 1,
      borderBottomColor: isDark ? "#444" : "#e0e0e0",
    },
    headerText: {
      fontSize: 18,
      fontWeight: "600",
      color: isDark ? "#ffffff" : "#000000",
    },
    closeButton: {
      padding: 8,
    },
    scrollView: {
      flex: 1,
      paddingHorizontal: 16,
      paddingVertical: 16,
    },
    markdownContainer: {
      marginBottom: 20,
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Guía - Herramienta de Monitoreo</Text>
        {onClose && (
          <Pressable style={styles.closeButton} onPress={onClose}>
            <Ionicons
              name="close"
              size={24}
              color={isDark ? "#ffffff" : "#000000"}
            />
          </Pressable>
        )}
      </View>

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={true}
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        <QuickReference/>
        <View style={styles.markdownContainer}>
          <EnrichedMarkdownText
            markdown={GUIDE_CONTENT}
            markdownStyle={{
              paragraph: {
                color: isDark ? "#e0e0e0" : "#333333",
                fontSize: 14,
                lineHeight: 22,
              },
              h1: {
                color: isDark ? "#ffffff" : "#000000",
                fontWeight: "bold",
                marginTop: 20,
                marginBottom: 12,
                fontSize: 24,
              },
              h2: {
                color: isDark ? "#ffffff" : "#000000",
                fontWeight: "bold",
                marginTop: 16,
                marginBottom: 10,
                fontSize: 20,
              },
              h3: {
                color: isDark ? "#ffffff" : "#000000",
                fontWeight: "bold",
                marginTop: 14,
                marginBottom: 8,
                fontSize: 16,
              },
              em: {
                color: isDark ? "#90caf9" : "#1976d2",
                fontStyle: "italic",
              },
              strong: {
                color: isDark ? "#ffb74d" : "#f57c00",
                fontWeight: "bold",
              },
              link: {
                color: isDark ? "#64b5f6" : "#1976d2",
                underline: true,
              },
              code: {
                backgroundColor: isDark ? "#2a2a2a" : "#f5f5f5",
                color: isDark ? "#4ecdc4" : "#d63384",
                // padding: 4,
                // borderRadius: 3,
              },
              codeBlock: {
                backgroundColor: isDark ? "#1a1a1a" : "#f5f5f5",
                color: isDark ? "#e0e0e0" : "#333333",
                padding: 12,
                borderRadius: 8,
                marginTop: 8,
                marginBottom: 8,
                fontSize: 13,
              },
              blockquote: {
                borderColor: isDark ? "#666" : "#ddd",
                borderWidth: 1,
                color: isDark ? "#b0b0b0" : "#666",
                marginTop: 8,
                marginBottom: 8,
              },
              list: {
                color: isDark ? "#e0e0e0" : "#333333",
                fontSize: 14,
                lineHeight: 22,
              },
            }}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
