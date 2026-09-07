import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { fonts } from '../../constants/typography';

interface JobOfferCardProps {
  offer: any;
  currentUserId?: string;
  colors: any;
  relativeTimeStr: string;
  onPress: () => void;
  onPressCity?: (name: string, locations: string[]) => void;
  onContact?: (ustaId: string, ustaName: string) => void;
  onDelete?: (offerId: string) => void;
}

export const JobOfferCard: React.FC<JobOfferCardProps> = ({
  offer,
  currentUserId,
  colors,
  relativeTimeStr,
  onPress,
  onPressCity,
  onContact,
  onDelete,
}) => {
  const isOwnJob = offer.ustaId === currentUserId;

  return (
    <TouchableOpacity
      style={[styles.jobCard, { borderLeftColor: colors.primary }]}
      activeOpacity={isOwnJob ? 1 : 0.85}
      onPress={onPress}
    >
      <View style={styles.jobCardHeader}>
        <TouchableOpacity
          style={[styles.cityBadge, { backgroundColor: colors.primary + '08', borderColor: colors.primary + '20', maxWidth: '70%' }]}
          activeOpacity={0.6}
          onPress={(e) => {
            e.stopPropagation();
            if (onPressCity) {
              onPressCity(
                offer.ustaName || 'Usta',
                offer.ustaFullLocations ? offer.ustaFullLocations.split(' • ') : [offer.ustaCityOnly || offer.ustaCity || 'Konum belirtilmedi']
              );
            }
          }}
        >
          <Ionicons name="location" size={10} color={colors.primary} style={{ marginRight: 4 }} />
          <Text
            style={[styles.cityBadgeText, { color: colors.primary, flexShrink: 1 }]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {offer.ustaFullLocations || offer.ustaCity || 'Konum belirtilmedi'}
          </Text>
        </TouchableOpacity>
        <View style={styles.jobCardUrgencyBadge}>
          <Ionicons name="time-outline" size={10} color="#F59E0B" style={{ marginRight: 2 }} />
          <Text style={styles.jobCardUrgencyText}>{relativeTimeStr}</Text>
        </View>
      </View>

      <View style={styles.jobCardBody}>
        <View style={styles.jobCardTitleRow}>
          <Ionicons name="briefcase-outline" size={14} color={colors.primary} style={{ marginRight: 6 }} />
          <Text style={styles.jobCardTitle} numberOfLines={2}>{offer.title}</Text>
        </View>
        <View style={styles.jobCardDescContainer}>
          <Text style={styles.jobCardDesc} numberOfLines={3}>{offer.description}</Text>
        </View>
      </View>

      <View style={styles.jobCardFooter}>
        <View style={styles.jobPublisherRow}>
          {offer.ustaAvatar ? (
            <Image source={{ uri: offer.ustaAvatar }} style={styles.jobPublisherAvatar} />
          ) : (
            <LinearGradient
              colors={[colors.primary, colors.primaryDark || '#1E40AF']}
              style={styles.jobPublisherAvatar}
            >
              <Text style={styles.jobPublisherAvatarText}>
                {offer.ustaName ? offer.ustaName.charAt(0).toUpperCase() : 'U'}
              </Text>
            </LinearGradient>
          )}
          <View>
            <Text style={styles.jobCardAuthorLabel}>Paslayan Usta</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
              <Text style={styles.jobCardAuthor}>{offer.ustaName}</Text>
              {offer.ustaVerified && <Ionicons name="checkmark-circle" size={12} color="#10B981" />}
            </View>
          </View>
        </View>

        {!isOwnJob && onContact && (
          <TouchableOpacity
            style={styles.jobContactBtnContainer}
            onPress={() => onContact(offer.ustaId, offer.ustaName)}
          >
            <LinearGradient
              colors={['#10B981', '#059669']}
              style={styles.jobContactGradient}
            >
              <Ionicons name="chatbubbles" size={13} color="#FFF" />
              <Text style={styles.jobContactText}>İşi Al / Konuş</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>

      {isOwnJob && (
        <View style={styles.ownerControlRow}>
          <View style={styles.ownJobBadge}>
            <Ionicons name="checkmark-circle" size={12} color="#059669" />
            <Text style={styles.ownJobBadgeText}>İlanınız Yayında</Text>
          </View>
          {onDelete && (
            <TouchableOpacity
              style={styles.jobDeleteBtn}
              onPress={(event) => {
                event.stopPropagation();
                onDelete(offer.id);
              }}
              accessibilityRole="button"
              accessibilityLabel="İş paylaşımını sil"
            >
              <Ionicons name="trash" size={12} color="#EF4444" style={{ marginRight: 4 }} />
              <Text style={styles.jobDeleteBtnText}>İlanı Sil</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  jobCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderLeftWidth: 4,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  jobCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  cityBadgeText: {
    fontFamily: fonts.bold,
    fontSize: 10,
  },
  jobCardUrgencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  jobCardUrgencyText: {
    fontFamily: fonts.medium,
    fontSize: 10,
    color: '#D97706',
  },
  jobCardBody: {
    marginBottom: 12,
  },
  jobCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  jobCardTitle: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: '#0F172A',
    flex: 1,
  },
  jobCardDescContainer: {
    paddingLeft: 20,
  },
  jobCardDesc: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
  },
  jobCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  jobPublisherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  jobPublisherAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  jobPublisherAvatarText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: '#FFFFFF',
  },
  jobCardAuthorLabel: {
    fontFamily: fonts.regular,
    fontSize: 9,
    color: '#94A3B8',
  },
  jobCardAuthor: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: '#0F172A',
  },
  jobContactBtnContainer: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  jobContactGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 4,
  },
  jobContactText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: '#FFFFFF',
  },
  ownerControlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  ownJobBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ownJobBadgeText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: '#059669',
  },
  jobDeleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#FEF2F2',
  },
  jobDeleteBtnText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: '#EF4444',
  },
});
