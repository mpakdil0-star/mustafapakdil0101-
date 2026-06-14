import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
  TextInput,
  Platform,
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

  const modalTitleText = label || placeholder || 'Seçim Yapın';
  const searchPlaceholderText = label ? `${label} ara...` : 'Ara...';

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
        <Ionicons name="chevron-down" size={16} color={colors.primary} style={styles.arrow} />
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
            <View style={styles.dragHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{modalTitleText}</Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close-circle-outline" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Search Input */}
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={18} color={colors.textSecondary} />
              <TextInput
                style={styles.searchInput}
                placeholder={searchPlaceholderText}
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
                  {value === item && item !== 'Elektrik Proje Çizimi' && <View style={styles.leftActiveBar} />}
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
                  {value === item && (
                    <Ionicons name="checkmark-circle" size={20} color={colors.primary} style={styles.checkmark} />
                  )}
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
    fontFamily: fonts.semiBold,
    fontSize: 13,
    color: colors.text,
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
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 52,
    shadowColor: 'rgba(15, 23, 42, 0.04)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.8,
    shadowRadius: 2,
    elevation: 1,
  },
  pickerError: {
    borderColor: colors.error,
  },
  pickerDisabled: {
    backgroundColor: colors.borderLight,
    opacity: 0.6,
  },
  pickerText: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.text,
    flex: 1,
  },
  placeholder: {
    fontFamily: fonts.regular,
    color: colors.textSecondary,
  },
  disabledText: {
    color: colors.textSecondary,
  },
  iconContainer: {
    marginRight: 10,
  },
  arrow: {
    marginLeft: spacing.sm,
  },
  errorText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: colors.error,
    marginTop: 4,
    marginLeft: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)', // slightly darker backdrop
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '75%', // 75% height is standard for bottom sheets
    paddingBottom: Platform.OS === 'ios' ? spacing.xl * 2 : 80,
  },
  dragHandle: {
    width: 38,
    height: 4.5,
    backgroundColor: colors.border,
    borderRadius: 2.25,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
    opacity: 0.7,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontFamily: fonts.bold,
    color: colors.text,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.borderLight + '40', // soft background
    marginHorizontal: 20,
    marginBottom: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    height: 46,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.text,
    marginLeft: 8,
    padding: 0,
  },
  closeButton: {
    padding: 4,
  },
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  optionItemSelected: {
    backgroundColor: colors.primary + '08', // subtle selection tint
  },
  leftActiveBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3.5,
    backgroundColor: colors.primary,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },
  optionText: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.text,
    flex: 1,
  },
  optionTextSelected: {
    color: colors.primary,
    fontFamily: fonts.bold,
  },
  checkmark: {
    marginLeft: 10,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.textSecondary,
  },
  projectOptionItem: {
    backgroundColor: '#EFF6FF',
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  projectOptionText: {
    color: '#1E40AF',
    fontFamily: fonts.bold,
  },
});
