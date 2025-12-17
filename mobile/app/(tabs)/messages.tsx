import { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, ListRenderItem } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAppSelector } from '../../hooks/redux';
import { Card } from '../../components/common/Card';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { typography } from '../../constants/typography';
import { messageService, Conversation } from '../../services/messageService';
import socketService from '../../services/socketService';

export default function MessagesScreen() {
  const router = useRouter();
  const { user } = useAppSelector((state) => state.auth);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadConversations = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) setIsLoading(true);
      const data = await messageService.getConversations();
      setConversations(data);
    } catch (error: any) {
      console.error('Error loading conversations:', error);
      // Backend endpoint henüz hazır değilse boş liste göster
      if (error?.response?.status === 404) {
        setConversations([]);
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Track if initial data has been loaded
  const hasLoadedInitial = useRef(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Sayfa ilk açıldığında yükle (sadece 1 kez)
  useFocusEffect(
    useCallback(() => {
      if (!hasLoadedInitial.current) {
        loadConversations();
        hasLoadedInitial.current = true;
      }
    }, [])
  );

  // Pull to refresh handler
  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadConversations(false);
  }, [loadConversations]);

  // Socket bildirimlerini dinle ve listeyi yenile
  useEffect(() => {
    // Socket'e bağlan
    socketService.connect();

    // Yeni mesaj geldiğinde listeyi yenile
    const unsubMessage = socketService.onNotification((data) => {
      if (data.type === 'new_message') {
        console.log('📬 New message notification, refreshing conversations');
        loadConversations();
      }
    });

    return () => {
      unsubMessage();
    };
  }, [loadConversations]);

  const getOtherParticipant = (conversation: Conversation) => {
    if (!user) return null;
    return conversation.participant1Id === user.id
      ? conversation.participant2
      : conversation.participant1;
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Mesajlar yükleniyor...</Text>
      </View>
    );
  }

  if (!isLoading && conversations.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>💬</Text>
            <Text style={styles.emptyTitle}>Mesajlar</Text>
            <Text style={styles.emptySubtitle}>
              Henüz mesajınız yok. İş ilanları veya teklifler üzerinden mesajlaşmaya başlayabilirsiniz.
            </Text>
          </Card>
        </View>
      </View>
    );
  }

  // Render conversation item
  const renderConversationItem: ListRenderItem<Conversation> = useCallback(({ item: conversation }) => {
    const otherParticipant = getOtherParticipant(conversation);
    if (!otherParticipant) return null;

    return (
      <TouchableOpacity
        onPress={() => router.push(`/messages/${conversation.id}`)}
        activeOpacity={0.7}
      >
        <Card style={styles.conversationCard}>
          <View style={styles.conversationHeader}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {otherParticipant.fullName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.conversationInfo}>
              <View style={styles.conversationHeaderRow}>
                <Text style={styles.conversationName} numberOfLines={1}>
                  {otherParticipant.fullName}
                </Text>
                {conversation.unreadCount > 0 && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadBadgeText}>
                      {conversation.unreadCount}
                    </Text>
                  </View>
                )}
              </View>
              {conversation.lastMessage && (
                <Text style={styles.lastMessage} numberOfLines={1}>
                  {conversation.lastMessage.content}
                </Text>
              )}
              <Text style={styles.conversationTime}>
                {conversation.lastMessage
                  ? new Date(conversation.lastMessage.createdAt).toLocaleDateString('tr-TR', {
                    day: 'numeric',
                    month: 'short',
                  })
                  : new Date(conversation.updatedAt).toLocaleDateString('tr-TR', {
                    day: 'numeric',
                    month: 'short',
                  })}
              </Text>
            </View>
          </View>
        </Card>
      </TouchableOpacity>
    );
  }, [router, user]);

  const keyExtractor = useCallback((item: Conversation) => item.id, []);

  return (
    <View style={styles.container}>
      <FlatList
        data={conversations}
        renderItem={renderConversationItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
          />
        }
        ListHeaderComponent={
          isLoading ? (
            <View style={styles.inlineLoader}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
  },
  listContent: {
    padding: spacing.screenPadding,
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.screenPadding,
  },
  inlineLoader: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  emptyCard: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    ...typography.h4,
    color: colors.text,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  emptySubtitle: {
    ...typography.body2,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.backgroundLight,
  },
  loadingText: {
    ...typography.body2,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  conversationCard: {
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  conversationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    ...typography.h5,
    color: colors.white,
    fontWeight: '700',
  },
  conversationInfo: {
    flex: 1,
  },
  conversationHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  conversationName: {
    ...typography.h6,
    color: colors.text,
    fontWeight: '700',
    flex: 1,
  },
  unreadBadge: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  unreadBadgeText: {
    ...typography.caption,
    color: colors.white,
    fontWeight: '700',
    fontSize: 11,
  },
  lastMessage: {
    ...typography.body2,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  conversationTime: {
    ...typography.caption,
    color: colors.textLight,
  },
});
