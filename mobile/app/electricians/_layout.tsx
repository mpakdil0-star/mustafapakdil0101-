import { Stack } from 'expo-router';
import { colors } from '../../constants/colors';

export default function ElectriciansLayout() {
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
        headerShadowVisible: false,
        animation: 'slide_from_right',


      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Ustalar',
          headerTitle: 'Öne Çıkan Ustalar'
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          title: 'Usta Detayı',
        }}
      />
    </Stack>
  );
}

