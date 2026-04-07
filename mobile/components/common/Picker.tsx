import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { typography, fonts } from '../../constants/typography';

interface PickerProps {
  label?: string;
  placeholder?: string;
  value: string;
  options: string[];
  onValueChange: (value: string) => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  containerStyle?: any;
  pickerStyle?: any;
  icon?: React.ReactNode;
}

export const Picker: React.FC<PickerProps> = ({
  label,
  placeholder = 'Seçiniz...',
  value,
  options,
  onValueChange,
  error,
  required = false,
  disabled = false,
  containerStyle,
  pickerStyle,
  icon,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredOptions = options.filter((option) =>
    option.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={styles.label}>
          {label} {required && <Text style={styles.required}>*</Text>}
        </Text>
      )}

      <TouchableOpacity
        style={[
          styles.picker,
          error && styles.pickerError,
          disabled && styles.pickerDisabled,
          pickerStyle,
        ]}
        onPress={() => {
          if (!disabled) {
            setSearchQuery('');
            setModalVisible(true);
          }
        }}
        activeOpacity={disabled ? 1 : 0.7}
        disabled={disabled}
      >
        {icon && <View style={styles.iconContainer}>{icon}</View>}
        <Text
          style={[
            styles.pickerText,
            (!value || disabled) && styles.placeholder,
            disabled && styles.disabledText,
          ]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {value || placeholder}
        </Text>
        <Text style={styles.arrow}>▼</Text>
      </TouchableOpacity>

      {error && <Text style={styles.errorText}>{error}</Text>}

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{label}</Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>Kapat</Text>
              </TouchableOpacity>
            </View>

            {/* Search Input */}
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color={colors.textSecondary} />
              <TextInput
                style={styles.searchInput}
                placeholder={`${label} ara...`}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
                placeholderTextColor={colors.textLight}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={18} color={colors.textLight} />
                </TouchableOpacity>
              )}
            </View>

            <FlatList
              data={filteredOptions}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.optionItem,
                    value === item && styles.optionItemSelected,
                    item === 'Elektrik Proje Çizimi' && styles.projectOptionItem
                  ]}
                  onPress={() => {
                    onValueChange(item);
                    setModalVisible(false);
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      {item === 'Elektrik Proje Çizimi' && (
                        <View style={{ backgroundColor: '#2563EB', padding: 4, borderRadius: 6, marginRight: 8 }}>
                          <Ionicons name="pencil-outline" size={14} color="#FFF" />
                        </View>
                      )}
                      <Text
                        style={[
                          styles.optionText,
                          value === item && styles.optionTextSelected,
                          item === 'Elektrik Proje Çizimi' && styles.projectOptionText
                        ]}
                      >
                        {item}
                      </Text>
                      {item === 'Elektrik Proje Çizimi' && (
                        <View style={{ backgroundColor: '#DBEAFE', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 8 }}>
                           <Text style={{ fontSize: 9, fontFamily: fonts.bold, color: '#1E40AF' }}>MÜHENDİS</Text>
                        </View>
                      )}
                    </View>
                    {item === 'Elektrik Proje Çizimi' && (
                      <Text style={{ fontSize: 11, color: '#64748B', marginTop: 2, fontFamily: fonts.medium }}>Mühendislik Onay & Teknik Dosya</Text>
                    )}
                  </View>
                  {value === item && <Text style={styles.checkmark}>✓</Text>}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>Sonuç bulunamadı</Text>
                </View>
              }
              keyboardShouldPersistTaps="handled"
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.body2,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  required: {
    color: colors.error,
  },
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: spacing.radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 48,
  },
  pickerError: {
    borderColor: colors.error,
  },
  pickerDisabled: {
    backgroundColor: colors.borderLight,
    opacity: 0.6,
  },
  pickerText: {
    ...typography.body1,
    color: colors.text,
    flex: 1,
  },
  placeholder: {
    color: colors.textSecondary,
  },
  disabledText: {
    color: colors.textSecondary,
  },
  iconContainer: {
    marginRight: spacing.xs,
  },
  arrow: {
    fontSize: 10,
    color: colors.primary,
    marginLeft: spacing.sm,
    opacity: 0.8,
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
    marginTop: spacing.xs,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: spacing.radius.lg,
    borderTopRightRadius: spacing.radius.lg,
    height: '85%', // Biraz daha yüksek yaparak alanı genişletelim
    paddingBottom: Platform.OS === 'ios' ? spacing.xl * 2 : 100, // Alt navigasyon çubuğu için ekstra boşluk
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    marginBottom: spacing.sm,
  },
  modalTitle: {
    ...typography.h4Style,
    color: colors.text,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundLight,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: spacing.radius.md,
    height: 48,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.text,
    marginLeft: spacing.xs,
  },
  closeButton: {
    padding: spacing.xs,
  },
  closeButtonText: {
    ...typography.body2,
    color: colors.primary,
    fontWeight: '600',
  },
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  optionItemSelected: {
    backgroundColor: colors.primaryLight + '20',
  },
  optionText: {
    ...typography.body1,
    color: colors.text,
    flex: 1,
  },
  optionTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  checkmark: {
    fontSize: 18,
    color: colors.primary,
    fontWeight: 'bold',
  },
  emptyContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    ...typography.body2,
    color: colors.textSecondary,
  },
  projectOptionItem: {
    backgroundColor: '#EFF6FF',
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  projectOptionText: {
    color: '#1E40AF',
    fontWeight: 'bold',
  },
});
