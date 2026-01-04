import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TextInputProps,
  StyleProp,
  ViewStyle,
  TextStyle,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors as staticColors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { fonts } from '../../constants/typography';
import { useAppColors } from '../../hooks/useAppColors';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
  inputContainerStyle?: StyleProp<ViewStyle>;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  containerStyle,
  labelStyle,
  inputContainerStyle,
  style,
  ...props
}) => {
  const colors = useAppColors();
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  // Check if this input is intended to be secure
  const isSecureInput = props.secureTextEntry === true;

  // Determine if we should show the toggle icon (only if no custom rightIcon is provided)
  const showPasswordToggle = isSecureInput && !rightIcon;

  // Determine the actual secureTextEntry value based on state
  const secureTextEntry = isSecureInput ? !isPasswordVisible : props.secureTextEntry;

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={[styles.label, { color: colors.text }, labelStyle]}>{label}</Text>}
      <View
        style={[
          styles.inputContainer,
          { backgroundColor: colors.backgroundLight, borderColor: colors.border },
          inputContainerStyle,
          error ? styles.inputContainerError : null,
          props.editable === false ? [styles.inputContainerDisabled, { backgroundColor: colors.backgroundDark }] : null,
        ]}
      >
        {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
        <TextInput
          style={[
            styles.input,
            { color: colors.text },
            leftIcon ? styles.inputWithLeftIcon : null,
            (rightIcon || showPasswordToggle) ? styles.inputWithRightIcon : null,
            style,
          ]}
          placeholderTextColor={colors.textLight}
          {...props}
          secureTextEntry={secureTextEntry}
        />
        {(rightIcon || showPasswordToggle) && (
          <View style={styles.rightIcon}>
            {rightIcon || (
              <TouchableOpacity onPress={() => setIsPasswordVisible(!isPasswordVisible)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons
                  name={isPasswordVisible ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color={colors.textLight}
                />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
      {(error || helperText) && (
        <Text style={[styles.helperText, { color: colors.textSecondary }, error ? styles.errorText : null]}>
          {error || helperText}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  label: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    marginBottom: spacing.sm,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: spacing.radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    minHeight: 48,
  },
  inputContainerError: {
    borderColor: staticColors.error,
    backgroundColor: staticColors.errorLight + '20',
  },
  inputContainerDisabled: {
    opacity: 0.6,
  },
  input: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 15,
    paddingVertical: spacing.md,
  },
  inputWithLeftIcon: {
    marginLeft: spacing.sm,
  },
  inputWithRightIcon: {
    marginRight: spacing.sm,
  },
  leftIcon: {
    marginRight: spacing.sm,
  },
  rightIcon: {
    marginLeft: spacing.sm,
  },
  helperText: {
    fontFamily: fonts.regular,
    fontSize: 12,
    marginTop: spacing.xs,
  },
  errorText: {
    color: staticColors.error,
  },
});
