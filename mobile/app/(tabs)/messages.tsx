import { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, ListRenderItem, ImageBackground } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAppSelector } from '../../hooks/redux';
import { Card } from '../../components/common/Card';
import { colors as staticColors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { typography, fonts } from '../../constants/typography';
import { useAppColors } from '../../hooks/useAppColors';
import { messageService, Conversation } from '../../services/messageService';
import socketService from '../../services/socketService';
import { PremiumHeader } from '../../components/common/PremiumHeader';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { EmptyState } from '../../components/common/EmptyState';
import { Button } from '../../components/common/Button';
import { AuthGuardModal } from '../../components/common/AuthGuardModal';
import { formatRelativeTime } from '../../utils/date';

export default function MessagesScreen() {
  const router = useRouter();
  const colors = useAppColors();
  const { user, guestRole } = useAppSelector((state) => state.auth);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadConversations = useCallback(async (showLoader = true) => {
    try {
      if (showLoader && conversations.length === 0) setIsLoading(true);
      const data = await messageService.getConversations();
      setConversations(data);
    } catch (error: any) {
      if (error?.response?.status === 404) {
        setConversations([]);
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadConversations(false);
  }, [loadConversations]);

  const getOtherParticipant = useCallback((conversation: Conversation) => {
    if (conversation.otherUser) return conversation.otherUser;
    if (!user) return null;
    return conversation.participant1Id === user.id
      ? conversation.participant2
      : conversation.participant1;
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadConversations();
    }, [loadConversations])
  );

  useEffect(() => {
    socketService.connect();

    // Yeni mesaj veya bildirim geldiğinde listeyi güncelle
    const unsubNotification = socketService.onNotification((data) => {
      console.log('📬 [Messages] Global notification received:', data.type);

      if (data.type === 'new_message' && data.message) {
        const newMessage = data.message;

        setConversations(prev => {
          // İlgili konuşmayı bul
          const convIndex = prev.findIndex(c => c.id === newMessage.conversationId);

          if (convIndex !== -1) {
            // Konuşma zaten listede var
            const updatedConversations = [...prev];
            const targetConv = { ...updatedConversations[convIndex] };

            // Son mesajı ve okunmamış sayısını güncelle
            targetConv.lastMessage = newMessage;

            // Eğer aktif olarak bu konuşmada değilsek (messages ekranındayız) sayıyı artır
            // Not: Mesajlarım ekranında olduğumuz için her halükarda artırıyoruz (servis katmanı filter'layabilir)
            targetConv.unreadCount = (targetConv.unreadCount || 0) + 1;

            // Listeden çıkar ve başa ekle
            updatedConversations.splice(convIndex, 1);
            return [targetConv, ...updatedConversations];
          } else {
            // Konuşma listede yok (ilk defa mesaj geldi), tüm listeyi yeniden çekmek en güvenlisi
            loadConversations(false);
            return prev;
          }
        });
      } else {
        // Diğer bildirim türleri için listeyi yenile
        loadConversations(false);
      }
    });

    // Karşı taraf mesajları okuduğunda listeyi güncelle
    const unsubRead = socketService.onMessagesRead((data) => {
      console.log('📖 [Messages] Messages read event:', data.conversationId);
      setConversations(prev => {
        return prev.map(conv => {
          if (conv.id === data.conversationId) {
            return {
              ...conv,
              unreadCount: 0,
              lastMessage: conv.lastMessage ? { ...conv.lastMessage, isRead: true } : conv.lastMessage
            };
          }
          return conv;
        });
      });
    });

    return () => {
      unsubNotification();
      unsubRead();
    };
  }, [loadConversations]);

  const renderConversationItem: ListRenderItem<Conversation> = useCallback(({ item: conversation }) => {
    const otherParticipant = getOtherParticipant(conversation);
    if (!otherParticipant) return null;

    const hasUnread = conversation.unreadCount > 0;
    const accentColor = hasUnread ? colors.primary : colors.textLight;

    return (
      <TouchableOpacity
        onPress={() => {
          // PROACTIVE: Mark as read locally immediately for better UX
          if (hasUnread) {
            setConversations(prev => prev.map(c =>
              c.id === conversation.id ? { ...c, unreadCount: 0 } : c
            ));
          }
          router.push({ pathname: '/messages/[id]', params: { id: conversation.id } });
        }}
        activeOpacity={0.8}
      >
        <Card variant="default" style={[styles.messageGlassCard, { shadowColor: isElectrician ? colors.primary : (colors as any).shadowAmethyst || colors.primary }]}>
          <View style={styles.cardInner}>
            {/* Avatar with Glow */}
            <View style={styles.avatarWrapper}>
              <View style={[styles.avatarGlow, { backgroundColor: colors.primary + '20' }]} />
              <View style={[styles.avatarContainer, { backgroundColor: colors.primary + '10', borderColor: staticColors.white }, hasUnread && { borderColor: colors.primary + '30' }]}>
                <Text style={[styles.avatarText, { color: colors.primary }]}>
                  {otherParticipant.fullName.charAt(0).toUpperCase()}
                </Text>
              </View>
              {hasUnread && <View style={[styles.onlineBadge, { borderColor: staticColors.white }]} />}
            </View>

            {/* Content Area */}
            <View style={styles.contentArea}>
              <View style={styles.headerRow}>
                <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>
                  {otherParticipant.fullName}
                </Text>
                <Text style={[styles.timeText, { color: staticColors.textLight }]}>
                  {conversation.lastMessage ? formatRelativeTime(conversation.lastMessage.createdAt) : ''}
                </Text>
              </View>

              <View style={styles.lastMsgRow}>
                <Text
                  style={[styles.lastMsgText, { color: staticColors.textSecondary }, hasUnread && [styles.unreadMsgText, { color: colors.text }]]}
                  numberOfLines={1}
                >
                  {conversation.lastMessage?.content || 'Sohbeti başlatın...'}
                </Text>
                {hasUnread && (
                  <LinearGradient
                    colors={isElectrician ? ['#FF4B2B', '#FF416C'] : (colors as any).primaryGradient || ['#7C3AED', '#8B5CF6']}
                    style={styles.unreadCountBadge}
                  >
                    <Text style={styles.unreadCountText}>{conversation.unreadCount}</Text>
                  </LinearGradient>
                )}
              </View>
            </View>

            <Ionicons name="chevron-forward" size={16} color={staticColors.textLight} style={styles.chevron} />
          </View>
        </Card>
      </TouchableOpacity>
    );
  }, [router, getOtherParticipant]);

  const isElectrician = user?.userType === 'ELECTRICIAN' || guestRole === 'ELECTRICIAN';
  const [showAuthModal, setShowAuthModal] = useState(false);

  // If not authenticated, show guest state
  if (!user) {
    return (
      <View style={styles.container}>
        <PremiumHeader
          title="Mesajlar"
          subtitle="Sohbetlerinizi buradan yönetin"
          layout="tab"
        />
        <View style={styles.guestCardWrapper}>
          <EmptyState
            icon="chatbubbles-outline"
            title="Mesajları Görüntüle"
            description="Mesajlarınızı görmek ve yeni mesaj göndermek için giriş yapmalısınız."
            buttonTitle="Giriş Yap / Kayıt Ol"
            onButtonPress={() => setShowAuthModal(true)}
          />
        </View>
        <AuthGuardModal
          visible={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          onLogin={() => {
            setShowAuthModal(false);
            router.push('/(auth)/login');
          }}
          onRegister={() => {
            setShowAuthModal(false);
            router.push({
              pathname: '/(auth)/register',
              params: {
                initialRole: isElectrician ? 'ELECTRICIAN' : 'CITIZEN',
              }
            });
          }}
        />
      </View>
    );
  }

  if (isLoading && conversations.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <PremiumHeader
        title="Mesajlarım"
        subtitle="Sohbetlerinize Göz Atın"
        layout="tab"
        backgroundImage={require('../../assets/images/header_bg.png')}
      />

      <FlatList
        data={conversations}
        renderItem={renderConversationItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} colors={[colors.primary]} />
        }
        ListEmptyComponent={() => {
          if (!user) {
            return (
              <View style={styles.guestCardWrapper}>
                <Card style={styles.guestCard} elevated>
                  <View style={[styles.guestIconContainer, { backgroundColor: colors.primary + '10' }]}>
                    <Ionicons name="chatbubbles-outline" size={60} color={colors.primary} />
                  </View>
                  <Text style={[styles.guestTitle, { color: colors.text }]}>Mesajlarınızı Yönetin</Text>
                  <Text style={[styles.guestSubtitle, { color: staticColors.textSecondary }]}>
                    Oturum açarak ustalara mesaj gönderebilir ve gelen teklifleri anlık olarak görüşebilirsiniz.
                  </Text>
                  <Button
                    title="Giriş Yap / Kayıt Ol"
                    onPress={() => router.push('/(auth)/login')}
                    variant="primary"
                    fullWidth
                    style={styles.guestButton}
                  />
                </Card>
              </View>
            );
          }

          return (
            <EmptyState
              icon="chatbubbles-outline"
              title="Mesaj Kutun Sessiz..."
              description="Henüz kimseyle mesajlaşmadın. Bir ilana teklif vererek veya ilanına gelen bir teklifi kabul ederek sohbet başlatabilirsin."
              buttonTitle="İlanları İncele"
              onButtonPress={() => router.push('/(tabs)/jobs')}
              style={{ paddingTop: 80 }}
            />
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: 100,
    flexGrow: 1,
  },
  guestCardWrapper: {
    paddingTop: spacing.lg,
    width: '100%',
    alignItems: 'center',
  },
  guestCard: {
    width: '100%',
    padding: 24,
    alignItems: 'center',
    borderRadius: 24,
    backgroundColor: staticColors.white,
  },
  guestIconContainer: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 40,
  },
  guestTitle: {
    fontFamily: fonts.extraBold,
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 8,
  },
  guestSubtitle: {
    fontFamily: fonts.medium,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  guestButton: {
    height: 50,
    borderRadius: 14,
  },
  messageGlassCard: {
    borderRadius: 24,
    padding: 14,
    marginBottom: 12,
    backgroundColor: staticColors.white,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.03,
    shadowRadius: 12,
    elevation: 2,
  },
  cardInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: 16,
  },
  avatarGlow: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    opacity: 0.4,
    transform: [{ scale: 1.1 }],
  },
  avatarContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: staticColors.white,
  },
  activeAvatarBorder: {
  },
  avatarText: {
    fontFamily: fonts.extraBold,
    fontSize: 20,
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#10B981',
    borderWidth: 2.5,
    borderColor: staticColors.white,
  },
  contentArea: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  userName: {
    fontFamily: fonts.extraBold,
    fontSize: 16,
    letterSpacing: -0.3,
  },
  timeText: {
    fontFamily: fonts.medium,
    fontSize: 11,
  },
  lastMsgRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMsgText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    flex: 1,
    marginRight: 8,
  },
  unreadMsgText: {
    fontFamily: fonts.bold,
  },
  unreadCountBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadCountText: {
    fontFamily: fonts.bold,
    fontSize: 10,
    color: staticColors.white,
  },
  chevron: {
    marginLeft: 8,
  },
  emptyContainer: {
    paddingTop: 80,
  },
  emptyCard: {
    alignItems: 'center',
    padding: 40,
    borderRadius: 30,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontFamily: fonts.bold,
    fontSize: 18,
    marginBottom: 10,
  },
  emptySubtitle: {
    fontFamily: fonts.medium,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  headerIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
});
