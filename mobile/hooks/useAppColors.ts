import { useAppSelector } from './redux';
import { getThemeColors } from '../constants/colors';

/**
 * Hook to provide dynamic theme colors based on the user's role.
 * Citizens get the Purple theme, Electricians get the Sapphire Blue theme.
 */
export const useAppColors = () => {
    const { user, guestRole } = useAppSelector((state) => state.auth);

    // Use userType from logged in user or guestRole for non-logged in users
    const userType = user?.userType || (guestRole ?? undefined);

    return getThemeColors(userType);
};
