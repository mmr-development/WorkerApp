import { View, type ViewProps } from 'react-native';

import { useThemeColor } from '@/hooks/useThemeColor';

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
};

export function ThemedView({ style, lightColor, darkColor, ...otherProps }: ThemedViewProps) {
  // Force light theme by always using the light color
  const backgroundColor = lightColor || '#FFFFFF'; // Default to white if no lightColor provided

  return <View style={[{ backgroundColor }, style]} {...otherProps} />;
}