import { Matrix4, multiply4, processTransform3d } from "@shopify/react-native-skia";
import { View } from "react-native";
import { Gesture, GestureDetector} from "react-native-gesture-handler";
import { type SharedValue, useSharedValue} from "react-native-reanimated";

import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useRef } from "react";

const multiply = (...matrices: Matrix4[]) => {
  "worklet";
  return matrices.reduce((acc, matrix) => multiply4(acc, matrix), Matrix4());
};

const translation = (x: number, y: number) => {
  "worklet";
  return processTransform3d([{ translateX: x }, { translateY: y }]);
};

const scale = (value: number) => {
  "worklet";
  return processTransform3d([{ scale: value }]);
};

const rotation = (angle: number) => {
  "worklet";
  return processTransform3d([{ rotateZ: angle }]);
};

interface GestureHandlerProps {
  size: { x: number; y: number, width:number, height:number };
  children: (matrix: SharedValue<Matrix4>) => React.ReactNode;
}

export default function GestureHandler ({ size, children }: GestureHandlerProps) {
  const matrix = useSharedValue<Matrix4>(Matrix4());

  const prevTranslation = useSharedValue({ x: 0, y: 0 });
  const prevRotation = useSharedValue(0);
  const prevScale = useSharedValue(1);
  const prevFocal = useSharedValue({ x: 0, y: 0 });
  const prevPointers = useSharedValue(0);
  const anchorFrozen = useSharedValue(false);
  const pendingT = useSharedValue({ x: 0, y: 0 });

  const resetValue = ()=>{
    "worklet";
    matrix.value = Matrix4();
    prevTranslation.value = { x: 0, y: 0 };
    prevRotation.value = 0;
    prevScale.value = 1;
    prevFocal.value = { x: 0, y: 0 };
    prevPointers.value = 0;
    anchorFrozen.value = false;
    pendingT.value = { x: 0, y: 0 };
  }
  const lastTap = useRef(0);//Allows to update lastTap inside tapping method

  const tapping = Gesture.Tap()
    .onEnd(()=>{
      const temp = Date.now();
      if(temp - lastTap.current <400){ //max delay between taps <400ms
        lastTap.current = 0;
        resetValue()
      }
      lastTap.current = temp;
    })

  const pan = Gesture.Pan()
    .onStart(() => {
      prevTranslation.value = { x: 0, y: 0 };
    })
    .onChange((e) => {
      const dx = e.translationX - prevTranslation.value.x;
      const dy = e.translationY - prevTranslation.value.y;
      prevTranslation.value = { x: e.translationX, y: e.translationY };
      matrix.value = multiply(translation(dx, dy), matrix.value);
    })

  const pinch = Gesture.Pinch()
    .onStart((e) => {
      prevScale.value = 1;
      prevFocal.value = { x: e.focalX, y: e.focalY };
      prevPointers.value = 0;
      anchorFrozen.value = false;
      pendingT.value = { x: 0, y: 0 };
    })
    .onChange((e) => {
      const countChanged = e.numberOfPointers !== prevPointers.value;
      prevPointers.value = e.numberOfPointers;
      const prev = { x: prevFocal.value.x, y: prevFocal.value.y };
      const deltaScale = prevScale.value === 0 ? 1 : e.scale / prevScale.value;
      prevScale.value = e.scale;
      if (countChanged) {
        pendingT.value = { x: 0, y: 0 };
        prevFocal.value = { x: e.focalX, y: e.focalY };
        anchorFrozen.value = e.numberOfPointers < 2;
        matrix.value = multiply(
          translation(e.focalX, e.focalY),
          scale(deltaScale),
          translation(-e.focalX, -e.focalY),
          matrix.value
        );
      } else if (anchorFrozen.value) {
        prevFocal.value = { x: e.focalX, y: e.focalY };
        matrix.value = multiply(
          translation(e.focalX, e.focalY),
          scale(deltaScale),
          translation(-e.focalX, -e.focalY),
          matrix.value
        );
      } else {
        matrix.value = multiply(
          translation(pendingT.value.x, pendingT.value.y),
          translation(prev.x, prev.y),
          scale(deltaScale),
          translation(-prev.x, -prev.y),
          matrix.value
        );
        pendingT.value = { x: e.focalX - prev.x, y: e.focalY - prev.y };
        prevFocal.value = { x: e.focalX, y: e.focalY };
      }
    })

  const rotate = Gesture.Rotation()
    .onStart((e) => {
      prevRotation.value = 0;
      prevFocal.value = { x: e.anchorX, y: e.anchorY };
      prevPointers.value = 0;
      anchorFrozen.value = false;
      pendingT.value = { x: 0, y: 0 };
    })
    .onChange((e) => {
      const countChanged = e.numberOfPointers !== prevPointers.value;
      prevPointers.value = e.numberOfPointers;
      const prev = { x: prevFocal.value.x, y: prevFocal.value.y };
      const deltaRotation = e.rotation - prevRotation.value;
      prevRotation.value = e.rotation;
      if (countChanged) {
        pendingT.value = { x: 0, y: 0 };
        prevFocal.value = { x: e.anchorX, y: e.anchorY };
        anchorFrozen.value = e.numberOfPointers < 2;
        matrix.value = multiply(
          translation(e.anchorX, e.anchorY),
          rotation(deltaRotation),
          translation(-e.anchorX, -e.anchorY),
          matrix.value
        );
      } else if (anchorFrozen.value) {
        prevFocal.value = { x: e.anchorX, y: e.anchorY };
        matrix.value = multiply(
          translation(e.anchorX, e.anchorY),
          rotation(deltaRotation),
          translation(-e.anchorX, -e.anchorY),
          matrix.value
        );
      } else {
        matrix.value = multiply(
          translation(pendingT.value.x, pendingT.value.y),
          translation(prev.x, prev.y),
          rotation(deltaRotation),
          translation(-prev.x, -prev.y),
          matrix.value
        );
        pendingT.value = { x: e.anchorX - prev.x, y: e.anchorY - prev.y };
        prevFocal.value = { x: e.anchorX, y: e.anchorY };
      }
    })

  const gesture = Gesture.Simultaneous(pan, pinch, rotate, tapping);

  return (
      <GestureHandlerRootView>
        <GestureDetector gesture={gesture}>
          <View style={{ width: size.width, height: size.height, margin:"auto" }}>
          {children(matrix)}
          </View>
        </GestureDetector>
      </GestureHandlerRootView>
  );
};