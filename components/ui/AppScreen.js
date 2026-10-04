import React from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import { colors } from '../../constants/theme';

export default function AppScreen({ children, style, statusBarStyle = 'dark-content' }) {
  return (
    <View style={[styles.container, style]}>
      <StatusBar barStyle={statusBarStyle} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
