import { Stack } from 'expo-router';
import { colors } from '../../constants/colors';

export default function JobsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: colors.primary,
        },
        headerTintColor: colors.white,
        headerTitleStyle: {
          fontWeight: '600',
          fontSize: 18,
        },
        headerBackTitleVisible: false,
        headerShadowVisible: false,
        presentation: 'card',
        animation: 'slide_from_right',
        headerBackButtonDisplayMode: 'minimal',
      }}
    >
      <Stack.Screen
        name="[id]/index"
        options={{
          headerShown: false, // Custom back button in component
        }}
      />
    </Stack>
  );
}

