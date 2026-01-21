import { Gesture, GestureDetector} from "react-native-gesture-handler";
import { useSharedValue } from "react-native-reanimated";

import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Point } from "@/types/types";
import { runOnJS } from "react-native-worklets";

interface GestureHandlerProps {
  tap: ({x,y}: Point)=>void
  panStart: ({x,y}: Point)=>void
  pan: ({x,y}: Point)=>void
  panEnd: ({x,y}: Point)=>void
  children: any;
}

export default function GestureHandler (props: GestureHandlerProps) {

  const pan = Gesture.Pan()
    .onStart((e)=> {
      runOnJS(props.panStart)({x:e.x, y:e.y});
    })
    .onChange((e) => {
      runOnJS(props.pan)({x:e.x, y:e.y});
    })
    .onEnd((e) => {
      runOnJS(props.panEnd)({x:e.x, y:e.y});
    });

  const tap = Gesture.Tap()
    .onEnd((e) => {
      runOnJS(props.tap)({x:e.x, y:e.y});
    });

  const gesture = Gesture.Simultaneous(pan, tap);

  return (
      <GestureHandlerRootView>
        <GestureDetector gesture={gesture}>
          {props.children}
        </GestureDetector>
      </GestureHandlerRootView>
  );
};