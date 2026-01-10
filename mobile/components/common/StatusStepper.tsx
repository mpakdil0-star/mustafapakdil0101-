import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { fonts } from '../../constants/typography';

interface Step {
    label: string;
    id: string;
}

interface StatusStepperProps {
    steps: Step[];
    currentStepId: string;
    style?: ViewStyle;
}

export const StatusStepper: React.FC<StatusStepperProps> = ({
    steps,
    currentStepId,
    style,
}) => {
    const currentStepIndex = steps.findIndex((step) => step.id === currentStepId);

    return (
        <View style={[styles.container, style]}>
            {steps.map((step, index) => {
                const isCompleted = index < currentStepIndex;
                const isActive = index === currentStepIndex;
                const isLast = index === steps.length - 1;

                return (
                    <View key={step.id} style={styles.stepWrapper}>
                        <View style={styles.stepMain}>
                            {/* Line */}
                            {!isLast && (
                                <View
                                    style={[
                                        styles.line,
                                        isCompleted && styles.lineCompleted,
                                    ]}
                                />
                            )}

                            {/* Dot */}
                            <View
                                style={[
                                    styles.dot,
                                    isCompleted && styles.dotCompleted,
                                    isActive && styles.dotActive,
                                ]}
                            >
                                {isCompleted ? (
                                    <Ionicons name="checkmark" size={14} color={colors.white} />
                                ) : isActive ? (
                                    <View style={styles.dotInner} />
                                ) : null}
                            </View>

                            {/* Label */}
                            <Text
                                style={[
                                    styles.label,
                                    isActive && styles.labelActive,
                                    isCompleted && styles.labelCompleted,
                                ]}
                            >
                                {step.label}
                            </Text>
                        </View>
                    </View>
                );
            })}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.xs,
    },
    stepWrapper: {
        flex: 1,
    },
    stepMain: {
        alignItems: 'center',
        position: 'relative',
    },
    line: {
        position: 'absolute',
        left: '50%',
        top: 10,
        width: '100%',
        height: 2,
        backgroundColor: '#F1F5F9', // Lighter gray
        zIndex: -1,
    },
    lineCompleted: {
        backgroundColor: colors.success,
    },
    dot: {
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: colors.white,
        borderWidth: 2,
        borderColor: '#F1F5F9', // Lighter gray
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
        zIndex: 1,
    },
    dotActive: {
        borderColor: colors.primary,
        backgroundColor: colors.white,
    },
    dotCompleted: {
        backgroundColor: colors.success,
        borderColor: colors.success,
    },
    dotInner: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: colors.primary,
    },
    label: {
        fontFamily: fonts.medium,
        fontSize: 10,
        color: '#94A3B8', // Lighter text color
        textAlign: 'center',
        maxWidth: 80,
    },
    labelActive: {
        fontFamily: fonts.bold,
        color: colors.primary,
        fontSize: 11,
    },
    labelCompleted: {
        color: colors.text,
    },
});
