import { Stack } from 'expo-router';
import { colors } from '../../constants/colors';

export default function MessagesLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
                headerStyle: {
                    backgroundColor: colors.primary,
                },
                headerTintColor: colors.white,
                headerTitleStyle: {
                    fontWeight: '600',
                },
            }}
        >
            <Stack.Screen
                name="[id]"
                options={{
                    title: 'Mesaj',
                }}
            />
        </Stack>
    );
}
