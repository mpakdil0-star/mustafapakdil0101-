import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TextInput,
    TouchableOpacity,
    Animated,
    Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { PremiumHeader } from '../../../components/common/PremiumHeader';
import { Card } from '../../../components/common/Card';
import { colors as staticColors } from '../../../constants/colors';
import { spacing } from '../../../constants/spacing';
import { fonts } from '../../../constants/typography';
import { useAppColors } from '../../../hooks/useAppColors';

type CalculatorTab = 'cable' | 'voltage' | 'ohm' | 'power';

interface CalculationResult {
    value: string;
    unit: string;
    description: string;
}

export default function CalculatorScreen() {
    const colors = useAppColors();
    const [activeTab, setActiveTab] = useState<CalculatorTab>('cable');
    const [result, setResult] = useState<CalculationResult | null>(null);

    // Cable Section inputs
    const [current, setCurrent] = useState('');
    const [distance, setDistance] = useState('');
    const [maxDrop, setMaxDrop] = useState('3');

    // Voltage Drop inputs
    const [vdCurrent, setVdCurrent] = useState('');
    const [vdDistance, setVdDistance] = useState('');
    const [vdSection, setVdSection] = useState('');

    // Ohm's Law inputs
    const [ohmVoltage, setOhmVoltage] = useState('');
    const [ohmCurrent, setOhmCurrent] = useState('');
    const [ohmResistance, setOhmResistance] = useState('');

    // Power inputs
    const [powerVoltage, setPowerVoltage] = useState('220');
    const [powerCurrent, setPowerCurrent] = useState('');
    const [powerFactor, setPowerFactor] = useState('0.85');

    const tabs = [
        { id: 'cable', label: 'Kablo Kesiti', icon: 'flash' },
        { id: 'voltage', label: 'Gerilim Düşümü', icon: 'trending-down' },
        { id: 'ohm', label: 'Ohm Kanunu', icon: 'analytics' },
        { id: 'power', label: 'Güç', icon: 'power' },
    ];

    // Copper conductivity (m/Ω·mm²)
    const COPPER_CONDUCTIVITY = 56;

    const calculateCableSection = () => {
        Keyboard.dismiss();
        const I = parseFloat(current);
        const L = parseFloat(distance);
        const dropPercent = parseFloat(maxDrop);

        if (isNaN(I) || isNaN(L) || isNaN(dropPercent)) {
            setResult({ value: 'Hata', unit: '', description: 'Tüm alanları doldurun.' });
            return;
        }

        // Formula: S = (2 × I × L) / (κ × ΔU)
        // ΔU = V × dropPercent / 100 (for 230V)
        const voltage = 230;
        const allowedDrop = (voltage * dropPercent) / 100;
        const section = (2 * I * L) / (COPPER_CONDUCTIVITY * allowedDrop);

        // Standard cable sections
        const standardSections = [1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120];
        const recommendedSection = standardSections.find(s => s >= section) || standardSections[standardSections.length - 1];

        // Calculate actual drop with recommended section
        const actualDrop = (2 * I * L) / (COPPER_CONDUCTIVITY * recommendedSection);
        const actualDropPercent = (actualDrop / voltage) * 100;

        setResult({
            value: recommendedSection.toString(),
            unit: 'mm²',
            description: `Hesaplanan: ${section.toFixed(2)} mm²\nGerçek düşüm: %${actualDropPercent.toFixed(2)}`,
        });
    };

    const calculateVoltageDrop = () => {
        Keyboard.dismiss();
        const I = parseFloat(vdCurrent);
        const L = parseFloat(vdDistance);
        const S = parseFloat(vdSection);

        if (isNaN(I) || isNaN(L) || isNaN(S)) {
            setResult({ value: 'Hata', unit: '', description: 'Tüm alanları doldurun.' });
            return;
        }

        // Formula: ΔU = (2 × L × I) / (κ × S)
        const voltage = 230;
        const voltageDrop = (2 * L * I) / (COPPER_CONDUCTIVITY * S);
        const dropPercent = (voltageDrop / voltage) * 100;

        setResult({
            value: dropPercent.toFixed(2),
            unit: '%',
            description: `Gerilim düşümü: ${voltageDrop.toFixed(2)} V\n${dropPercent <= 3 ? '✅ Kabul edilebilir' : '⚠️ Yüksek!'}`,
        });
    };

    const calculateOhm = () => {
        Keyboard.dismiss();
        const V = parseFloat(ohmVoltage);
        const I = parseFloat(ohmCurrent);
        const R = parseFloat(ohmResistance);

        const filled = [!isNaN(V), !isNaN(I), !isNaN(R)].filter(Boolean).length;

        if (filled !== 2) {
            setResult({ value: 'Hata', unit: '', description: 'İki değer girin, üçüncüsü hesaplansın.' });
            return;
        }

        if (isNaN(V)) {
            // V = I × R
            const result = I * R;
            setResult({ value: result.toFixed(2), unit: 'V', description: 'Gerilim = Akım × Direnç' });
        } else if (isNaN(I)) {
            // I = V / R
            const result = V / R;
            setResult({ value: result.toFixed(2), unit: 'A', description: 'Akım = Gerilim / Direnç' });
        } else {
            // R = V / I
            const result = V / I;
            setResult({ value: result.toFixed(2), unit: 'Ω', description: 'Direnç = Gerilim / Akım' });
        }
    };

    const calculatePower = () => {
        Keyboard.dismiss();
        const V = parseFloat(powerVoltage);
        const I = parseFloat(powerCurrent);
        const pf = parseFloat(powerFactor);

        if (isNaN(V) || isNaN(I) || isNaN(pf)) {
            setResult({ value: 'Hata', unit: '', description: 'Tüm alanları doldurun.' });
            return;
        }

        // P = V × I × cosφ
        const power = V * I * pf;
        const apparentPower = V * I;

        setResult({
            value: power.toFixed(0),
            unit: 'W',
            description: `Görünür güç: ${apparentPower.toFixed(0)} VA\nAktif güç: ${power.toFixed(0)} W`,
        });
    };

    const handleCalculate = () => {
        switch (activeTab) {
            case 'cable':
                calculateCableSection();
                break;
            case 'voltage':
                calculateVoltageDrop();
                break;
            case 'ohm':
                calculateOhm();
                break;
            case 'power':
                calculatePower();
                break;
        }
    };

    const renderInput = (label: string, value: string, setValue: (v: string) => void, unit: string, placeholder?: string) => (
        <View style={styles.inputRow}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>{label}</Text>
            <View style={styles.inputWrapper}>
                <TextInput
                    style={[styles.input, { color: colors.text, borderColor: colors.primary + '40' }]}
                    value={value}
                    onChangeText={setValue}
                    keyboardType="decimal-pad"
                    placeholder={placeholder || '0'}
                    placeholderTextColor={staticColors.textLight}
                />
                <Text style={[styles.inputUnit, { color: staticColors.textSecondary }]}>{unit}</Text>
            </View>
        </View>
    );

    const renderCableSection = () => (
        <View style={styles.inputsContainer}>
            {renderInput('Akım', current, setCurrent, 'A')}
            {renderInput('Mesafe', distance, setDistance, 'm')}
            {renderInput('Max. Düşüm', maxDrop, setMaxDrop, '%')}
        </View>
    );

    const renderVoltageDrop = () => (
        <View style={styles.inputsContainer}>
            {renderInput('Akım', vdCurrent, setVdCurrent, 'A')}
            {renderInput('Mesafe', vdDistance, setVdDistance, 'm')}
            {renderInput('Kablo Kesiti', vdSection, setVdSection, 'mm²')}
        </View>
    );

    const renderOhmLaw = () => (
        <View style={styles.inputsContainer}>
            <Text style={[styles.hintText, { color: staticColors.textSecondary }]}>
                İki değer girin, üçüncüsü hesaplansın
            </Text>
            {renderInput('Gerilim (V)', ohmVoltage, setOhmVoltage, 'V')}
            {renderInput('Akım (I)', ohmCurrent, setOhmCurrent, 'A')}
            {renderInput('Direnç (R)', ohmResistance, setOhmResistance, 'Ω')}
        </View>
    );

    const renderPower = () => (
        <View style={styles.inputsContainer}>
            {renderInput('Gerilim', powerVoltage, setPowerVoltage, 'V')}
            {renderInput('Akım', powerCurrent, setPowerCurrent, 'A')}
            {renderInput('Güç Faktörü', powerFactor, setPowerFactor, 'cosφ')}
        </View>
    );

    return (
        <View style={styles.container}>
            <PremiumHeader title="Elektrik Hesaplayıcı" showBackButton />

            <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
                {/* Tab Selector */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.tabScrollView}
                    contentContainerStyle={styles.tabContainer}
                >
                    {tabs.map((tab) => (
                        <TouchableOpacity
                            key={tab.id}
                            style={[
                                styles.tab,
                                activeTab === tab.id && { backgroundColor: colors.primary },
                            ]}
                            onPress={() => {
                                setActiveTab(tab.id as CalculatorTab);
                                setResult(null);
                            }}
                        >
                            <Ionicons
                                name={tab.icon as any}
                                size={18}
                                color={activeTab === tab.id ? staticColors.white : colors.primary}
                            />
                            <Text
                                style={[
                                    styles.tabText,
                                    { color: activeTab === tab.id ? staticColors.white : colors.primary },
                                ]}
                            >
                                {tab.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* Input Card */}
                <Card style={styles.inputCard}>
                    {activeTab === 'cable' && renderCableSection()}
                    {activeTab === 'voltage' && renderVoltageDrop()}
                    {activeTab === 'ohm' && renderOhmLaw()}
                    {activeTab === 'power' && renderPower()}

                    <TouchableOpacity onPress={handleCalculate} activeOpacity={0.85}>
                        <LinearGradient
                            colors={[colors.primary, colors.primary + 'DD']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.calculateButton}
                        >
                            <Ionicons name="calculator" size={20} color={staticColors.white} />
                            <Text style={styles.calculateButtonText}>HESAPLA</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </Card>

                {/* Result Card */}
                {result && (
                    <Card style={[styles.resultCard, { borderColor: colors.primary + '40' }]}>
                        <View style={styles.resultHeader}>
                            <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                            <Text style={[styles.resultTitle, { color: colors.text }]}>SONUÇ</Text>
                        </View>
                        <View style={styles.resultValueRow}>
                            <Text style={[styles.resultValue, { color: colors.primary }]}>{result.value}</Text>
                            <Text style={[styles.resultUnit, { color: colors.primary }]}>{result.unit}</Text>
                        </View>
                        <Text style={[styles.resultDescription, { color: staticColors.textSecondary }]}>
                            {result.description}
                        </Text>
                    </Card>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    scrollView: {
        flex: 1,
    },
    content: {
        padding: spacing.md,
        paddingBottom: 100,
    },
    tabScrollView: {
        marginBottom: spacing.md,
    },
    tabContainer: {
        flexDirection: 'row',
        gap: 8,
        paddingHorizontal: 4,
    },
    tab: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
    },
    tabText: {
        fontFamily: fonts.bold,
        fontSize: 13,
    },
    inputCard: {
        padding: spacing.lg,
        marginBottom: spacing.md,
    },
    inputsContainer: {
        marginBottom: spacing.lg,
    },
    inputRow: {
        marginBottom: spacing.md,
    },
    inputLabel: {
        fontFamily: fonts.medium,
        fontSize: 14,
        marginBottom: 8,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    input: {
        flex: 1,
        height: 50,
        borderWidth: 1.5,
        borderRadius: 12,
        paddingHorizontal: 16,
        fontFamily: fonts.semiBold,
        fontSize: 16,
        backgroundColor: staticColors.white,
    },
    inputUnit: {
        fontFamily: fonts.bold,
        fontSize: 14,
        marginLeft: 12,
        minWidth: 40,
    },
    hintText: {
        fontFamily: fonts.regular,
        fontSize: 13,
        fontStyle: 'italic',
        marginBottom: spacing.md,
    },
    calculateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        height: 56,
        borderRadius: 16,
    },
    calculateButtonText: {
        fontFamily: fonts.extraBold,
        fontSize: 16,
        color: staticColors.white,
        letterSpacing: 1,
    },
    resultCard: {
        padding: spacing.lg,
        borderWidth: 2,
        backgroundColor: 'rgba(59, 130, 246, 0.03)',
    },
    resultHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: spacing.sm,
    },
    resultTitle: {
        fontFamily: fonts.bold,
        fontSize: 14,
        letterSpacing: 1,
    },
    resultValueRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 8,
        marginBottom: spacing.sm,
    },
    resultValue: {
        fontFamily: fonts.extraBold,
        fontSize: 48,
    },
    resultUnit: {
        fontFamily: fonts.bold,
        fontSize: 24,
    },
    resultDescription: {
        fontFamily: fonts.medium,
        fontSize: 14,
        lineHeight: 22,
    },
});
