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

    const renderInput = (
        label: string,
        value: string,
        setValue: (v: string) => void,
        unit: string,
        icon: string,
        placeholder?: string
    ) => (
        <View style={styles.inputRow}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>{label}</Text>
            <View style={[styles.inputWrapper, { borderColor: colors.primary + '30', backgroundColor: colors.backgroundLight }]}>
                <Ionicons name={icon as any} size={20} color={colors.primary} style={styles.inputIcon} />
                <TextInput
                    style={[styles.input, { color: colors.text }]}
                    value={value}
                    onChangeText={setValue}
                    keyboardType="decimal-pad"
                    placeholder={placeholder || '0'}
                    placeholderTextColor={staticColors.textLight}
                />
                <View style={[styles.unitBadge, { backgroundColor: colors.primary + '10' }]}>
                    <Text style={[styles.inputUnit, { color: colors.primary }]}>{unit}</Text>
                </View>
            </View>
        </View>
    );

    const renderCableSection = () => (
        <View style={styles.inputsContainer}>
            {renderInput('Akım', current, setCurrent, 'A', 'flash-outline')}
            {renderInput('Mesafe', distance, setDistance, 'm', 'resize-outline')}
            {renderInput('Maksimum İzin Verilen Düşüm', maxDrop, setMaxDrop, '%', 'trending-down-outline')}
        </View>
    );

    const renderVoltageDrop = () => (
        <View style={styles.inputsContainer}>
            {renderInput('Akım', vdCurrent, setVdCurrent, 'A', 'flash-outline')}
            {renderInput('Mesafe', vdDistance, setVdDistance, 'm', 'resize-outline')}
            {renderInput('Kablo Kesiti', vdSection, setVdSection, 'mm²', 'ellipse-outline')}
        </View>
    );

    const renderOhmLaw = () => (
        <View style={styles.inputsContainer}>
            <Text style={[styles.hintText, { color: staticColors.textSecondary }]}>
                Formülün çalışması için herhangi iki değeri girin, diğeri hesaplanacaktır
            </Text>
            {renderInput('Gerilim (V)', ohmVoltage, setOhmVoltage, 'V', 'pulse-outline')}
            {renderInput('Akım (I)', ohmCurrent, setOhmCurrent, 'A', 'flash-outline')}
            {renderInput('Direnç (R)', ohmResistance, setOhmResistance, 'Ω', 'analytics-outline')}
        </View>
    );

    const renderPower = () => (
        <View style={styles.inputsContainer}>
            {renderInput('Gerilim', powerVoltage, setPowerVoltage, 'V', 'pulse-outline')}
            {renderInput('Akım', powerCurrent, setPowerCurrent, 'A', 'flash-outline')}
            {renderInput('Güç Faktörü (cosφ)', powerFactor, setPowerFactor, 'cosφ', 'speedometer-outline')}
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <PremiumHeader title="Elektrik Hesaplayıcı" showBackButton />

            <ScrollView style={styles.scrollView} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {/* Tab Selector */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.tabScrollView}
                    contentContainerStyle={styles.tabContainer}
                >
                    {tabs.map((tab) => {
                        const isActive = activeTab === tab.id;
                        return (
                            <TouchableOpacity
                                key={tab.id}
                                activeOpacity={0.8}
                                style={[
                                    styles.tab,
                                    isActive 
                                        ? { backgroundColor: colors.primary, borderColor: colors.primary } 
                                        : { backgroundColor: colors.surface, borderColor: colors.border }
                                ]}
                                onPress={() => {
                                    setActiveTab(tab.id as CalculatorTab);
                                    setResult(null);
                                }}
                            >
                                <Ionicons
                                    name={tab.icon as any}
                                    size={18}
                                    color={isActive ? staticColors.white : colors.primary}
                                />
                                <Text
                                    style={[
                                        styles.tabText,
                                        { color: isActive ? staticColors.white : colors.textSecondary }
                                    ]}
                                >
                                    {tab.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>

                {/* Input Card */}
                <Card style={styles.inputCard} variant="default" elevated>
                    {activeTab === 'cable' && renderCableSection()}
                    {activeTab === 'voltage' && renderVoltageDrop()}
                    {activeTab === 'ohm' && renderOhmLaw()}
                    {activeTab === 'power' && renderPower()}

                    <TouchableOpacity onPress={handleCalculate} activeOpacity={0.85} style={styles.calculateBtnContainer}>
                        <LinearGradient
                            colors={colors.gradientPrimary}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={[styles.calculateButton, { shadowColor: colors.primary }]}
                        >
                            <Ionicons name="calculator" size={20} color={staticColors.white} />
                            <Text style={styles.calculateButtonText}>HESAPLA</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </Card>

                {/* Result Card */}
                {result && (
                    <Card 
                        variant="glass" 
                        style={[
                            styles.resultCard, 
                            { 
                                borderColor: result.value === 'Hata' ? colors.error + '40' : colors.primary + '40',
                                shadowColor: result.value === 'Hata' ? colors.error : colors.primary 
                            }
                        ]}
                    >
                        <View style={styles.resultHeader}>
                            <Ionicons 
                                name={result.value === 'Hata' ? "alert-circle" : "checkmark-circle"} 
                                size={24} 
                                color={result.value === 'Hata' ? colors.error : colors.primary} 
                            />
                            <Text style={[styles.resultTitle, { color: colors.text }]}>HESAPLAMA SONUCU</Text>
                        </View>
                        <View style={styles.resultValueRow}>
                            <Text style={[styles.resultValue, { color: result.value === 'Hata' ? colors.error : colors.primary }]}>{result.value}</Text>
                            {result.unit ? (
                                <Text style={[styles.resultUnit, { color: result.value === 'Hata' ? colors.error : colors.primary }]}>{result.unit}</Text>
                            ) : null}
                        </View>
                        <View style={[styles.divider, { backgroundColor: colors.border }]} />
                        <Text style={[styles.resultDescription, { color: colors.textSecondary }]}>
                            {result.description}
                        </Text>
                    </Card>
                )}

                {/* Reference Constants & Info Card */}
                <Card variant="outlined" style={[styles.infoCard, { borderColor: colors.border }]}>
                    <View style={styles.infoHeader}>
                        <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
                        <Text style={[styles.infoTitle, { color: colors.text }]}>Mühendislik Referans Değerleri</Text>
                    </View>
                    <View style={styles.infoGrid}>
                        <View style={styles.infoGridCol}>
                            <Text style={[styles.infoGridLabel, { color: colors.textSecondary }]}>Bakır İletkenliği (κ)</Text>
                            <Text style={[styles.infoGridValue, { color: colors.primary }]}>56 m/Ω·mm²</Text>
                        </View>
                        <View style={styles.infoGridCol}>
                            <Text style={[styles.infoGridLabel, { color: colors.textSecondary }]}>Standart Kesitler</Text>
                            <Text style={[styles.infoGridValue, { color: colors.primary }]}>1.5 - 120 mm²</Text>
                        </View>
                    </View>
                    <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                        Hesaplamalar TS EN 60228 standartlarına uygun 230V tek fazlı alternatif akım (AC) şebekeleri ve bakır iletkenler referans alınarak hesaplanmaktadır.
                    </Text>
                </Card>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    content: {
        padding: spacing.md,
        paddingBottom: 120,
    },
    tabScrollView: {
        marginBottom: spacing.md,
    },
    tabContainer: {
        flexDirection: 'row',
        gap: 8,
        paddingHorizontal: 4,
        paddingVertical: 4,
    },
    tab: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        borderWidth: 1.5,
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
        marginBottom: spacing.md,
    },
    inputRow: {
        marginBottom: spacing.md,
    },
    inputLabel: {
        fontFamily: fonts.semiBold,
        fontSize: 13,
        marginBottom: 8,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1.5,
        borderRadius: 14,
        paddingLeft: 12,
        height: 52,
        overflow: 'hidden',
    },
    inputIcon: {
        marginRight: 8,
    },
    input: {
        flex: 1,
        height: '100%',
        fontFamily: fonts.semiBold,
        fontSize: 15,
        paddingHorizontal: 4,
    },
    unitBadge: {
        paddingHorizontal: 12,
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        borderLeftWidth: 1,
        borderLeftColor: 'rgba(0, 0, 0, 0.05)',
    },
    inputUnit: {
        fontFamily: fonts.bold,
        fontSize: 13,
    },
    hintText: {
        fontFamily: fonts.medium,
        fontSize: 12,
        lineHeight: 18,
        marginBottom: spacing.md,
        opacity: 0.8,
    },
    calculateBtnContainer: {
        marginTop: spacing.sm,
    },
    calculateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        height: 54,
        borderRadius: 16,
        elevation: 4,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
    },
    calculateButtonText: {
        fontFamily: fonts.extraBold,
        fontSize: 15,
        color: staticColors.white,
        letterSpacing: 1,
    },
    resultCard: {
        padding: spacing.lg,
        marginBottom: spacing.md,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.1,
        shadowRadius: 16,
        elevation: 6,
    },
    resultHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: spacing.sm,
    },
    resultTitle: {
        fontFamily: fonts.bold,
        fontSize: 12,
        letterSpacing: 1,
    },
    resultValueRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 6,
        marginBottom: spacing.sm,
    },
    resultValue: {
        fontFamily: fonts.extraBold,
        fontSize: 40,
    },
    resultUnit: {
        fontFamily: fonts.bold,
        fontSize: 20,
    },
    divider: {
        height: 1,
        marginVertical: spacing.sm,
        opacity: 0.5,
    },
    resultDescription: {
        fontFamily: fonts.semiBold,
        fontSize: 13,
        lineHeight: 20,
    },
    infoCard: {
        padding: spacing.md,
        backgroundColor: 'transparent',
    },
    infoHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: spacing.sm,
    },
    infoTitle: {
        fontFamily: fonts.bold,
        fontSize: 13,
    },
    infoGrid: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: spacing.sm,
        marginTop: 4,
    },
    infoGridCol: {
        flex: 1,
    },
    infoGridLabel: {
        fontFamily: fonts.medium,
        fontSize: 11,
        marginBottom: 2,
    },
    infoGridValue: {
        fontFamily: fonts.bold,
        fontSize: 14,
    },
    infoText: {
        fontFamily: fonts.regular,
        fontSize: 11,
        lineHeight: 16,
        opacity: 0.8,
    },
});
