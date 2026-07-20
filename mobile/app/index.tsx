import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { colors } from '../constants/colors';

export default function Index() {
  // RootLayoutNav is the single authority for onboarding and auth redirects.
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});
