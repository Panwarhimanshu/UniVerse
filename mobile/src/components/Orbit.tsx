import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { colors } from '../theme';

/** Background for the blue cards: a sky-blue glow in the top corner and two orbit lines from the UniVerse logo */
export function Orbit() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width="100%" height="100%">
        <Defs>
          <RadialGradient id="glow" cx="100%" cy="0%" r="85%">
            <Stop offset="0" stopColor={colors.secondary} stopOpacity={0.55} />
            <Stop offset="1" stopColor={colors.secondary} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#glow)" />
        <Circle cx="96%" cy="-10%" r="120" stroke="#FFFFFF" strokeOpacity={0.1} strokeWidth={22} fill="none" />
        <Circle cx="96%" cy="-10%" r="170" stroke={colors.lime} strokeOpacity={0.55} strokeWidth={1.5} fill="none" />
      </Svg>
    </View>
  );
}
