import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

/** Two faint orbit lines from the UniVerse logo, for the corner of the dark cards */
export function Orbit() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width="100%" height="100%">
        <Circle cx="96%" cy="-10%" r="120" stroke="#FFFFFF" strokeOpacity={0.07} strokeWidth={22} fill="none" />
        <Circle cx="96%" cy="-10%" r="170" stroke="#2FA84F" strokeOpacity={0.18} strokeWidth={1.5} fill="none" />
      </Svg>
    </View>
  );
}
