import { useState, useMemo } from "react";
import { Text, View } from "react-native";

import AppButton from "@/components/ui/app-button";

import DetectionsTable from "@/database/tables/DetectionsTable";
import { ObjectDetectionResult } from "@/src/ObjectDetection";
import { Directory, File, Paths } from "expo-file-system";
import SaveModal from "./detectionsUtilities/SaveModal";
import ScanCanvas from "./ScanCanvas";
import { MD3Colors } from "react-native-paper";
import { getDiseaseColorMap } from "@/app/monitoring/diseaseColors";

type ScanCanvasProps = {
  detection: ObjectDetectionResult[];
  photoUri: string;
  deleteData: () => void;
  onSaveResult?: (result: { photo_dir: string; detection: ObjectDetectionResult[] }) => void;
  onCancel?: () => void;
};

export const getPhotosDirUri = () => {
  const appDataDir = Paths.document.uri;
  return `${appDataDir}photoScans/`;
};

export const checkIfPhotosDirExists = () => {
  const dirInfo = new Directory(getPhotosDirUri());
  if (!dirInfo.exists) {
    if (!dirInfo.createDirectory("photoScans").exists) {
      throw new Error("El directorio 'photoScans' no logró ser creado");
    }
  }
};

export const deletePhotoScansDir = () => {
  const dirInfo = new Directory(getPhotosDirUri());
  if (dirInfo.exists) {
    dirInfo.delete();
  }
};

const ScanControledCanvas = (props: ScanCanvasProps) => {
  const [saving, setIsSaving] = useState(false);
  const [saved, setIsSaved] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);

  const diseaseColorMap = useMemo(() => {
    const diseaseNames = props.detection
      .flatMap((det) => det.labels.map((l) => l.text))
      .filter((name): name is string => !!name);
    return getDiseaseColorMap([...new Set(diseaseNames)]);
  }, [props.detection]);

  const save = () => {
    setIsSaving(true);
    checkIfPhotosDirExists();

    const photoFile = new File(props.photoUri);
    photoFile.move(new Directory(getPhotosDirUri()));

    const result = {
      photo_dir: photoFile.uri,
      detection: props.detection,
    };

    if (props.onSaveResult) {
      props.onSaveResult(result);
      setIsSaving(false);
      setIsSaved(true);
      setIsModalVisible(true);
      return;
    }

    DetectionsTable.insert({ photo_dir: photoFile.uri, detection: props.detection }).then(() => {
      setIsSaving(false);
      setIsSaved(true);
      setIsModalVisible(true);
    });
  };

  const close = () => {
    props.onCancel?.();
    props.deleteData();
  };

  return (
    <View style={{ flex: 1, display: "flex", gap:15 }}>
      <Text style={{ 
        color: MD3Colors.neutral30, 
        marginHorizontal: "auto", 
        fontSize: 24, 
        marginTop:15,
        zIndex:10, 
        backgroundColor: "#fffef4", 
        paddingVertical:5, 
        paddingHorizontal:8, 
        borderRadius:5 }}>
          Resultados de Reconocimiento
        </Text>
      <View style={{ flex: 2, display: "flex", alignItems: "center" }}>
        <ScanCanvas detection={props.detection} photoUri={props.photoUri} useGestureHandler={true} diseaseColorMap={diseaseColorMap} />
      </View>

      <View style={{ display: "flex", flexDirection: "row", gap: 15, marginHorizontal: "auto", marginBottom: 15 }}>
        <AppButton title="Descartar" onPress={close} />
        <AppButton
          disabled={saved || saving}
          title={saving ? "Guardando" : saved ? "Guardado" : "Guardar"}
          onPress={save}
        />
      </View>

      <SaveModal isModalVisible={isModalVisible} setIsModalVisible={setIsModalVisible} goBackCamera={close} />
    </View>
  );
};

export default ScanControledCanvas;