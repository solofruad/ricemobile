import { Gesture, GestureDetector} from "react-native-gesture-handler";

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
    .minDistance(11)
    .onStart((e)=> {
      runOnJS(props.panStart)({x:Math.floor(e.x), y: Math.floor(e.y)});
    })
    .onChange((e) => {
      // (props.pan)({x:Math.floor(e.x), y: Math.floor(e.y)});
      (props.pan)({x:e.x, y: e.y});
    })
    .onEnd((e) => {
      runOnJS(props.panEnd)({x: Math.floor(e.x), y: Math.floor(e.y)});
    });

  const tap = Gesture.Tap()
    .maxDistance(10)
    .onEnd((e) => {
      runOnJS(props.tap)({x: Math.floor(e.x), y: Math.floor(e.y)});
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