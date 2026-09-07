import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fonts } from '../../constants/typography';

interface ForumPostCardProps {
  post: any;
  currentUserId?: string;
  colors: any;
  onPress: () => void;
  onPressCity?: (name: string, locations: string[]) => void;
  onDelete?: (postId: string) => void;
  onShare?: () => void;
  relativeTimeStr: string;
}

export const ForumPostCard: React.FC<ForumPostCardProps> = ({
  post,
  currentUserId,
  colors,
  onPress,
  onPressCity,
  onDelete,
  onShare,
  relativeTimeStr,
}) => {
  const descText = post.description || '';
  const hashtagRegex = /#\w+/g;
  const parsedTags = descText.match(hashtagRegex) || [];

  let cleanedDesc = descText;
  if (parsedTags.length > 0) {
    cleanedDesc = descText.replace(hashtagRegex, '').trim();
  }

  return (
    <TouchableOpacity
      style={styles.forumCard}
      activeOpacity={0.8}
      onPress={onPress}
    >
      {/* Header Row */}
      <View style={styles.forumHeader}>
        <View style={styles.avatarWrapper}>
          {post.ustaAvatar ? (
            <Image source={{ uri: post.ustaAvatar }} style={styles.forumAvatar} />
          ) : (
            <View style={[styles.forumAvatar, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '30' }]}>
              <Text style={{ color: colors.primary, fontSize: 15, fontFamily: fonts.bold }}>
                {post.ustaName ? post.ustaName.charAt(0).toUpperCase() : 'U'}
              </Text>
            </View>
          )}
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={styles.forumAuthor}>{post.ustaName}</Text>
            {post.ustaVerified && (
              <Ionicons name="checkmark-circle" size={14} color="#0284C7" />
            )}
          </View>
          <View style={styles.authorBadgeRow}>
            {!!post.ustaCityOnly && (
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  if (onPressCity) {
                    onPressCity(
                      post.ustaName || 'Usta',
                      post.ustaFullLocations ? post.ustaFullLocations.split(' • ') : [post.ustaCityOnly || 'Konum belirtilmedi']
                    );
                  }
                }}
                style={styles.authorCityBadge}
                activeOpacity={0.6}
              >
                <Ionicons name="location-outline" size={10} color="#64748B" />
                <Text style={styles.authorCityBadgeText} numberOfLines={1}>{post.ustaCityOnly}</Text>
              </TouchableOpacity>
            )}
            {!!post.ustaCityOnly && <Text style={styles.bulletSeparator}>•</Text>}
            <Text style={styles.metaTime}>{relativeTimeStr}</Text>
          </View>
        </View>
        {post.ustaId === currentUserId && onDelete && (
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              onDelete(post.id);
            }}
            style={styles.deleteButton}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Teknik destek sorusunu sil"
            hitSlop={8}
          >
            <Ionicons name="trash-outline" size={13} color="#EF4444" />
          </TouchableOpacity>
        )}
      </View>

      {/* Title & Description */}
      <Text style={styles.forumTitle}>{post.title}</Text>
      {!!cleanedDesc && (
        <Text style={styles.forumDesc} numberOfLines={3}>{cleanedDesc}</Text>
      )}

      {/* Dynamic image slot */}
      {!!post.imageUrl && (
        <Image source={{ uri: post.imageUrl }} style={styles.forumImage} />
      )}

      {/* Dynamic Hashtags & Structured Capsules */}
      <View style={styles.tagCapsulesRow}>
        {parsedTags.length > 0 ? (
          parsedTags.map((tag: string, idx: number) => (
            <View key={idx} style={[styles.tagCapsule, { backgroundColor: colors.primary + '08', borderColor: colors.primary + '18' }]}>
              <Text style={[styles.tagCapsuleText, { color: colors.primary }]}>{tag}</Text>
            </View>
          ))
        ) : (
          <>
            <View style={[styles.tagCapsule, { backgroundColor: colors.primary + '08', borderColor: colors.primary + '18' }]}>
              <Ionicons name="construct-outline" size={10} color={colors.primary} />
              <Text style={[styles.tagCapsuleText, { color: colors.primary }]}>Teknik Soru</Text>
            </View>
            {!!post.ustaSpecialty && (
              <View style={[styles.tagCapsule, { backgroundColor: '#F0F9FF', borderColor: '#BAE6FD' }]}>
                <Ionicons name="ribbon-outline" size={10} color="#0284C7" />
                <Text style={[styles.tagCapsuleText, { color: '#0284C7' }]}>{post.ustaSpecialty}</Text>
              </View>
            )}
          </>
        )}
      </View>

      {/* Footer Row */}
      <View style={styles.forumFooter}>
        <View style={styles.footerPillsRow}>
          <View style={[styles.footerPill, { backgroundColor: colors.primary + '10' }]}>
            <Ionicons name="chatbubble-outline" size={12} color={colors.primary} style={{ marginRight: 4 }} />
            <Text style={[styles.footerPillText, { color: colors.primary }]}>
              {post.comments?.length ? `${post.comments.length} Cevap` : 'Cevap Yaz'}
            </Text>
          </View>
          {onShare && (
            <TouchableOpacity
              style={styles.footerShareBtn}
              onPress={(e) => {
                e.stopPropagation();
                onShare();
              }}
            >
              <Ionicons name="share-social-outline" size={12} color="#64748B" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  forumCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  forumHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatarWrapper: {
    position: 'relative',
  },
  forumAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  forumAuthor: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: '#0F172A',
  },
  authorBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  authorCityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    gap: 2,
  },
  authorCityBadgeText: {
    fontFamily: fonts.medium,
    fontSize: 10,
    color: '#64748B',
  },
  bulletSeparator: {
    color: '#CBD5E1',
    fontSize: 10,
  },
  metaTime: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: '#94A3B8',
  },
  deleteButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  forumTitle: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: '#0F172A',
    lineHeight: 20,
    marginBottom: 4,
  },
  forumDesc: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 8,
  },
  forumImage: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    marginBottom: 10,
    backgroundColor: '#F1F5F9',
  },
  tagCapsulesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  tagCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    gap: 4,
  },
  tagCapsuleText: {
    fontFamily: fonts.bold,
    fontSize: 10,
  },
  forumFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  footerPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  footerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  footerPillText: {
    fontFamily: fonts.bold,
    fontSize: 11,
  },
  footerShareBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
