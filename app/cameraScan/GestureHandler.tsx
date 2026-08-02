import { Matrix4, processTransform3d } from "@shopify/react-native-skia";
import { View } from "react-native";
import { Gesture, GestureDetector} from "react-native-gesture-handler";
import Animated, { type SharedValue, useDerivedValue, useSharedValue} from "react-native-reanimated";

import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useRef } from "react";

interface GestureHandlerProps {
  size: { x: number; y: number, width:number, height:number };
  children: (matrix: SharedValue<Matrix4>) => React.ReactNode;
}

export default function GestureHandler ({ size, children }: GestureHandlerProps) {
  const currentPosition = useSharedValue({ x: 0, y: 0 });
  const previousPosition = useSharedValue({ x: 0, y: 0 });

  const currentRotation = useSharedValue(0);
  const previousRotation = useSharedValue(0);

  const currentScale = useSharedValue(1);
  const previousScale = useSharedValue(1);

  const resetValue = ()=>{
    "worklet";
    currentPosition.value = { x: 0, y: 0 };
    previousPosition.value = { x: 0, y: 0 };

    currentRotation.value = 0;
    previousRotation.value = 0;

    currentScale.value = 1;
    previousScale.value = 1;
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
    .onChange((e) => {
      currentPosition.value = {
        x: e.translationX + previousPosition.value.x,
        y: e.translationY + previousPosition.value.y,
      };
    })
    .onEnd(() => {
      previousPosition.value = currentPosition.value;
    });

  const rotate = Gesture.Rotation()
    .onChange((e) => {
      currentRotation.value = e.rotation + previousRotation.value;
    })
    .onEnd(() => {
      previousRotation.value = currentRotation.value;
    });

  const pinch = Gesture.Pinch()
    .onChange((e) => {
      currentScale.value = e.scale * previousScale.value;
    })
    .onEnd(() => {
      previousScale.value = currentScale.value;
    });

  const gesture = Gesture.Simultaneous(pan, rotate, pinch, tapping);

  const matrix = useDerivedValue(() => {
    return processTransform3d([
      { translateX: currentPosition.value.x },
      { translateY: currentPosition.value.y },
      { translateX: size.width / 2 },
      { translateY: size.height / 2 },
      { scale: currentScale.value },
      { rotateZ: currentRotation.value },
      { translateX: -size.width / 2 },
      { translateY: -size.height / 2 },
    ]);
  });

  return (
      <GestureHandlerRootView>
        <GestureDetector gesture={gesture}>
          <View style={{ width: size.width, height: size.height }}>
          {children(matrix)}
          </View>
        </GestureDetector>
      </GestureHandlerRootView>
  );
};
