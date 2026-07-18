import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Animated,
  StatusBar,
  Image,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { fonts } from '../../constants/typography';
import { aiService, ChatMessage, CostEstimate, DiagnosisIssue } from '../../services/aiService';

// Quick reply chips
const CITIZEN_CHIPS = [
  { icon: '🔌', label: 'Elektrik arızası' },
  { icon: '🔧', label: 'Su kaçağı / Tesisat' },
  { icon: '🔒', label: 'Kapıda kaldım' },
  { icon: '🌡️', label: 'Kombi / Isınma sorunu' },
  { icon: '❄️', label: 'Klima sorunu' },
  { icon: '🏠', label: 'Diğer bir arıza' },
];

const USTA_CHIPS = [
  { icon: '📋', label: 'Teklif hazırla' },
  { icon: '✉️', label: 'İşi kabul mesajı' },
  { icon: '⚡', label: 'Kablo kesit hesabı' },
  { icon: '🔥', label: 'Kombi hata kodu' },
  { icon: '💰', label: 'Malzeme fiyatı' },
  { icon: '📄', label: 'İş tamamlama mesajı' },
];

// Example scenario cards shown in empty state
const EXAMPLE_SCENARIOS = [
  { icon: '🔥', text: 'Kombim çalışmıyor, E01 hatası veriyor' },
  { icon: '💧', text: 'Banyomda musluktan sürekli su damlıyor' },
  { icon: '⚡', text: 'Salondaki priz kıvılcım çıkarıyor' },
];

const USTA_SCENARIOS = [
  { icon: '📋', text: '3 priz değişimi için teklif hazırla' },
  { icon: '✉️', text: 'Müşteriye işi kabul mesajı yaz' },
  { icon: '🔧', text: 'Klima E5 hata kodu ne anlama geliyor?' },
];

/**
 * Renders AI text with basic markdown: **bold**, bullet lists.
 */
function renderFormattedText(text: string, isUser: boolean): React.ReactNode {
  if (!text) return null;
  const lines = text.split('\n');
  return lines.map((line, idx) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    const rendered = parts.map((part, pi) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <Text key={pi} selectable={true} style={isUser ? styles.boldUser : styles.boldModel}>
            {part.slice(2, -2)}
          </Text>
        );
      }
      return <Text key={pi} selectable={true}>{part}</Text>;
    });
    const isBullet = line.trimStart().startsWith('- ') || line.trimStart().startsWith('• ');
    const isNumbered = /^\d+\./.test(line.trimStart());
    if (isBullet) {
      return (
        <View key={idx} style={styles.bulletRow}>
          <Text selectable={true} style={isUser ? styles.bulletDotUser : styles.bulletDotModel}>•</Text>
          <Text selectable={true} style={isUser ? styles.bulletTextUser : styles.bulletTextModel}>
            {line.replace(/^[\s\-•]+/, '')}
          </Text>
        </View>
      );
    }
    if (isNumbered) {
      return (
        <View key={idx} style={styles.bulletRow}>
          <Text selectable={true} style={isUser ? styles.bulletDotUser : styles.bulletDotModel}>
            {line.match(/^\d+\./)?.[0]}
          </Text>
          <Text selectable={true} style={isUser ? styles.bulletTextUser : styles.bulletTextModel}>
            {line.replace(/^\d+\.\s*/, '')}
          </Text>
        </View>
      );
    }
    return (
      <Text key={idx} selectable={true} style={[isUser ? styles.userBubbleText : styles.modelBubbleText, { marginBottom: 2 }]}>
        {rendered}
      </Text>
    );
  });
}

interface MessageItem {
  id: string;
  role: 'user' | 'model';
  text: string;
  imageUri?: string;
  isEmergency?: boolean;
  report?: {
    category: string;
    subCategory?: string;
    title: string;
    description: string;
  };
  issues?: DiagnosisIssue[];
  quote?: {
    items: { desc: string; amount: number }[];
    total: number;
    note: string;
    validity: string;
  };
  messageTemplate?: {
    type: string;
    message: string;
  };
}

const getWelcomeMessage = (isElectrician: boolean): MessageItem => ({
  id: 'welcome',
  role: 'model',
  text: isElectrician
    ? 'Merhaba Usta! Teknik sorularınızı, hata kodlarını, ölçüm sonuçlarını veya iş kapsamını yazın. Birden fazla konu paylaşırsanız her birini ayrı ayrı ele alıp teklif ve müşteri mesajı hazırlayabilirim.'
    : 'Merhaba! Yaşadığınız sorunu doğal biçimde anlatın. Aynı mesajda birden fazla arıza yazabilirsiniz; her birini ayrı başlıkta inceleyip güvenlik adımlarını ve uygun hizmet yönlendirmesini hazırlayacağım.',
});

const severityPresentation = (severity?: DiagnosisIssue['severity']) => {
  switch (severity) {
    case 'critical': return { label: 'Acil', color: '#FB7185', background: 'rgba(244, 63, 94, 0.13)', icon: 'warning' as const };
    case 'high': return { label: 'Öncelikli', color: '#FBBF24', background: 'rgba(245, 158, 11, 0.13)', icon: 'alert-circle' as const };
    case 'low': return { label: 'Düşük risk', color: '#86EFAC', background: 'rgba(34, 197, 94, 0.12)', icon: 'checkmark-circle' as const };
    default: return { label: 'İncelenmeli', color: '#67E8F9', background: 'rgba(6, 182, 212, 0.12)', icon: 'information-circle' as const };
  }
};

export default function AiAssistantScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ role?: string }>();
  const insets = useSafeAreaInsets();
  
  // Determine role: default to CITIZEN if not specified
  const isElectrician = params.role === 'ELECTRICIAN';
  
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string>('image/jpeg');
  const [isPickingImage, setIsPickingImage] = useState(false);
  const [showChips, setShowChips] = useState(true);
  const [costEstimate, setCostEstimate] = useState<CostEstimate | null>(null);
  const [isFetchingCost, setIsFetchingCost] = useState(false);
  const [showCostCard, setShowCostCard] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const pickImage = async () => {
    try {
      setIsPickingImage(true);
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('İzin Gerekli', 'Fotoğraflı arıza teşhisi için galeri erişim izni vermeniz gerekmektedir.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setSelectedImage(asset.uri);
        setImageBase64(asset.base64 || null);
        setImageMimeType(asset.mimeType || 'image/jpeg');
      }
    } catch (error) {
      console.error('Pick image error:', error);
      Alert.alert('Hata', 'Fotoğraf seçilirken bir sorun oluştu.');
    } finally {
      setIsPickingImage(false);
    }
  };

  const takePhoto = async () => {
    try {
      setIsPickingImage(true);
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('İzin Gerekli', 'Fotoğraflı arıza teşhisi için kamera erişim izni vermeniz gerekmektedir.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setSelectedImage(asset.uri);
        setImageBase64(asset.base64 || null);
        setImageMimeType(asset.mimeType || 'image/jpeg');
      }
    } catch (error) {
      console.error('Take photo error:', error);
      Alert.alert('Hata', 'Fotoğraf çekilirken bir sorun oluştu.');
    } finally {
      setIsPickingImage(false);
    }
  };

  const handleAttachPress = () => {
    Alert.alert(
      'Görsel Ekle',
      'Arızanın fotoğrafını nasıl eklemek istersiniz?',
      [
        { text: 'Kamera ile Çek', onPress: takePhoto },
        { text: 'Galeriden Seç', onPress: pickImage },
        { text: 'Vazgeç', style: 'cancel' }
      ]
    );
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImageBase64(null);
  };
  
  // Typing indicator animation state
  const dot1Opacity = useRef(new Animated.Value(0.3)).current;
  const dot2Opacity = useRef(new Animated.Value(0.3)).current;
  const dot3Opacity = useRef(new Animated.Value(0.3)).current;

  // Initialize with welcome message
  useEffect(() => {
    setMessages([getWelcomeMessage(isElectrician)]);
  }, [isElectrician]);

  // Typing indicator loop animation
  useEffect(() => {
    let animation: Animated.CompositeAnimation;
    if (isLoading) {
      const createDotAnimation = (dot: Animated.Value, delay: number) => {
        return Animated.sequence([
          Animated.delay(delay),
          Animated.loop(
            Animated.sequence([
              Animated.timing(dot, { toValue: 1, duration: 400, useNativeDriver: true }),
              Animated.timing(dot, { toValue: 0.3, duration: 400, useNativeDriver: true }),
              Animated.delay(400)
            ])
          )
        ]);
      };
      
      animation = Animated.parallel([
        createDotAnimation(dot1Opacity, 0),
        createDotAnimation(dot2Opacity, 150),
        createDotAnimation(dot3Opacity, 300)
      ]);
      animation.start();
    } else {
      dot1Opacity.setValue(0.3);
      dot2Opacity.setValue(0.3);
      dot3Opacity.setValue(0.3);
    }
    return () => {
      if (animation) animation.stop();
    };
  }, [isLoading, dot1Opacity, dot2Opacity, dot3Opacity]);

  // Parse AI response for structured blocks: [TEŞHİS RAPORU], [TEKLİF ŞABLONU], [MESAJ ŞABLONU]
  const parseResponseBlocks = (text: string) => {
    let cleanText = text;
    let report: MessageItem['report'] = undefined;
    let issues: DiagnosisIssue[] | undefined;
    let quote: MessageItem['quote'] = undefined;
    let messageTemplate: MessageItem['messageTemplate'] = undefined;

    const extractBlock = (marker: string) => {
      const start = cleanText.indexOf(marker);
      if (start < 0) return null;
      const bodyStart = start + marker.length;
      const remaining = cleanText.slice(bodyStart);
      const nextMarkerOffset = remaining.search(/\n?\[(?:ARIZA LİSTESİ|TEŞHİS RAPORU|TEKLİF ŞABLONU|MESAJ ŞABLONU)\]/);
      const bodyEnd = nextMarkerOffset >= 0 ? bodyStart + nextMarkerOffset : cleanText.length;
      const block = cleanText.slice(bodyStart, bodyEnd).trim().replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
      cleanText = `${cleanText.slice(0, start)}\n${cleanText.slice(bodyEnd)}`.trim();
      return block;
    };

    // Parse the new multi-issue response first.
    const issueBlock = extractBlock('[ARIZA LİSTESİ]');
    if (issueBlock) {
      try {
        const obj = JSON.parse(issueBlock);
        if (Array.isArray(obj?.issues)) {
          issues = obj.issues
            .filter((issue: Partial<DiagnosisIssue>) => issue?.category && issue?.title)
            .map((issue: Partial<DiagnosisIssue>, index: number) => ({
              id: String(issue.id || `issue-${index + 1}`),
              category: String(issue.category),
              subCategory: issue.subCategory ? String(issue.subCategory) : undefined,
              title: String(issue.title),
              description: String(issue.description || 'Yerinde kontrol edilmesi önerilir.'),
              severity: ['low', 'medium', 'high', 'critical'].includes(String(issue.severity))
                ? issue.severity as DiagnosisIssue['severity']
                : 'medium',
              safetyAction: issue.safetyAction ? String(issue.safetyAction) : undefined,
              confidence: typeof issue.confidence === 'number' ? issue.confidence : undefined,
            }));
        }
      } catch (error) {
        console.warn('AI issue list could not be parsed', error);
      }
    }

    // Backward compatibility for old deployed Edge Function responses.
    const reportMarker = '[TEŞHİS RAPORU]';
    const reportBlock = extractBlock(reportMarker);
    if (reportBlock) {
      try {
        const obj = JSON.parse(reportBlock);
        if (obj?.category) {
          report = { category: obj.category, subCategory: obj.subCategory, title: obj.title || 'Arıza İlanı', description: obj.description || '' };
          if (!issues?.length) {
            issues = [{ id: 'issue-1', ...report, severity: 'medium' }];
          }
        }
      } catch (error) { console.warn('AI diagnosis report could not be parsed', error); }
    }

    // Parse [TEKLİF ŞABLONU]
    const quoteMarker = '[TEKLİF ŞABLONU]';
    const quoteBlock = extractBlock(quoteMarker);
    if (quoteBlock) {
      try {
        const obj = JSON.parse(quoteBlock);
        if (obj?.items && obj?.total) {
          quote = { items: obj.items, total: obj.total, note: obj.note || '', validity: obj.validity || '' };
        }
      } catch {}
    }

    // Parse [MESAJ ŞABLONU]
    const msgMarker = '[MESAJ ŞABLONU]';
    const messageBlock = extractBlock(msgMarker);
    if (messageBlock) {
      try {
        const obj = JSON.parse(messageBlock);
        if (obj?.message) {
          messageTemplate = { type: obj.type || 'genel', message: obj.message };
        }
      } catch {}
    }

    return { cleanText: cleanText.trim(), report, issues, quote, messageTemplate };
  };

  const handleCopyToClipboard = async (text: string, label: string) => {
    await Clipboard.setStringAsync(text);
    Alert.alert('✅ Kopyalandı', `${label} panoya kopyalandı. Mesajınıza yapıştırabilirsiniz.`);
  };

  const handleSend = async (overrideText?: string) => {
    const userMsgText = (overrideText ?? inputText).trim();
    if ((!userMsgText && !selectedImage) || isLoading) return;
    
    const currentImageUri = selectedImage;
    const currentImageBase64 = imageBase64;
    const currentImageMimeType = imageMimeType;
    
    setInputText('');
    setSelectedImage(null);
    setImageBase64(null);
    setShowChips(false);
    setCostEstimate(null);
    setShowCostCard(false);
    
    const userMessage: MessageItem = {
      id: Date.now().toString(),
      role: 'user',
      text: userMsgText,
      imageUri: currentImageUri || undefined
    };
    
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    setIsLoading(true);
    
    try {
      // The current message is sent separately; history must contain only prior turns.
      const history: ChatMessage[] = messages
        .slice(1)
        .map(m => ({ role: m.role, text: m.text }));
        
      const imagePayload = currentImageBase64 && currentImageMimeType ? {
        base64: currentImageBase64,
        mimeType: currentImageMimeType
      } : undefined;
        
      const response = await aiService.sendMessage(userMsgText, history, imagePayload, conversationId);
      if (response.conversationId) setConversationId(response.conversationId);
      const { cleanText, report, issues, quote, messageTemplate } = parseResponseBlocks(response.text);
      const isEmergency = cleanText.startsWith('🚨 ACİL') || cleanText.includes('🚨 ACİL:');
      
      setMessages(prev => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: 'model', text: cleanText, report, issues, isEmergency, quote, messageTemplate }
      ]);

      // Auto-fetch cost estimate when a diagnosis is returned
      const primaryIssue = issues?.[0] || report;
      if (primaryIssue?.category) {
        setIsFetchingCost(true);
        const est = await aiService.getCostEstimate(primaryIssue.category);
        setCostEstimate(est);
        setShowCostCard(est.found);
        setIsFetchingCost(false);
      }
      
    } catch {
      setMessages(prev => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: 'model', text: 'Üzgünüm, şu anda bağlantı kuramıyorum. Lütfen internet bağlantınızı kontrol edip tekrar deneyin.' }
      ]);
    } finally {
      setIsLoading(false);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const handleChipPress = (label: string) => { handleSend(label); };

  const handleNewConversation = () => {
    const reset = () => {
      setMessages([getWelcomeMessage(isElectrician)]);
      setConversationId(null);
      setInputText('');
      handleRemoveImage();
      setShowChips(true);
      setCostEstimate(null);
      setShowCostCard(false);
    };
    if (messages.length <= 1) return reset();
    Alert.alert('Yeni sohbet', 'Mevcut konuşmayı kapatıp yeni bir sohbet başlatmak istiyor musunuz?', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Yeni sohbet', onPress: reset },
    ]);
  };

  const handleCreateJob = (category: string, description: string, subCategory?: string) => {
    router.push({
      pathname: '/jobs/quick-create',
      params: { category, description, subCategory: subCategory || '' }
    });
  };

  const renderMessage = ({ item, index }: { item: MessageItem; index: number }) => {
    const isUser = item.role === 'user';
    const hasSafetyWarning = !isUser && (
      item.text.includes('⚠️ UYARI') || item.text.includes('⚠️ ÖNEMLİ') || item.text.includes('GÜVENLİK UYARISI')
    );
    const isEmergency = !isUser && item.isEmergency;
    const isLastMessage = index === messages.length - 1;

    return (
      <View>
        <View style={[styles.messageRow, isUser ? styles.userRow : styles.modelRow]}>
          {!isUser && (
            <View style={[styles.avatarCircle, { backgroundColor: isElectrician ? '#2E5C8A' : '#0D9488' }]}>
              <Ionicons name={isElectrician ? "hammer" : "sparkles"} size={14} color="#FFF" />
            </View>
          )}
          <View style={{ flex: 1, alignItems: isUser ? 'flex-end' : 'flex-start' }}>
            {isEmergency ? (
              <View style={styles.emergencyBanner}>
                <View style={styles.emergencyHeader}>
                  <Ionicons name="warning" size={18} color="#FF4444" />
                  <Text style={styles.emergencyTitle}>🚨 ACİL DURUM</Text>
                </View>
                <Text style={styles.emergencyText}>{item.text.replace('🚨 ACİL:', '').trim()}</Text>
                <TouchableOpacity style={styles.emergencyBtn} onPress={() => router.push({ pathname: '/jobs/quick-create', params: { category: 'elektrik', emergency: '1' } })}>
                  <Ionicons name="flash" size={14} color="#FFF" style={{ marginRight: 6 }} />
                  <Text style={styles.emergencyBtnText}>Hemen Acil Usta Bul</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={[styles.bubble, isUser ? [styles.userBubble, { backgroundColor: isElectrician ? '#2E5C8A' : '#115E59' }] : styles.modelBubble]}>
                {item.imageUri && (
                  <Image source={{ uri: item.imageUri }} style={styles.messageImage} resizeMode="cover" />
                )}
                {hasSafetyWarning && !isUser ? (
                  <View style={styles.warningContainer}>
                    <View style={styles.warningHeader}>
                      <Ionicons name="warning" size={18} color="#F87171" />
                      <Text style={styles.warningTitle}>GÜVENLİK UYARISI</Text>
                    </View>
                    <View>{renderFormattedText(item.text, false)}</View>
                  </View>
                ) : (
                  item.text ? <View>{renderFormattedText(item.text, isUser)}</View> : null
                )}
                {!isUser && item.text && (
                  <View style={styles.bubbleFooter}>
                    <TouchableOpacity
                      style={styles.bubbleCopyBtn}
                      onPress={() => handleCopyToClipboard(item.text, 'Mesaj')}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="copy-outline" size={13} color="#94A3B8" />
                      <Text style={styles.bubbleCopyText}>Kopyala</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
            {item.report && !item.issues?.length && (
              <View style={styles.reportCard}>
                <LinearGradient colors={['rgba(13, 148, 136, 0.12)', 'rgba(45, 212, 191, 0.04)']} style={styles.reportGradient}>
                  <View style={styles.reportHeader}>
                    <View style={styles.reportBadge}>
                      <Ionicons name="ribbon" size={14} color="#2DD4BF" />
                      <Text style={styles.reportBadgeText}>Akıllı Teşhis Raporu</Text>
                    </View>
                  </View>
                  <Text style={styles.reportTitle}>{item.report.title}</Text>
                  <Text style={styles.reportDesc}>{item.report.description}</Text>
                  {isLastMessage && showCostCard && costEstimate?.found && (
                    <View style={styles.costRow}>
                      <Ionicons name="cash-outline" size={14} color="#FCD34D" />
                      <Text style={styles.costText}>Tahmini maliyet: <Text style={styles.costAmount}>{costEstimate.label}</Text></Text>
                    </View>
                  )}
                  {isLastMessage && isFetchingCost && (
                    <View style={styles.costRow}>
                      <ActivityIndicator size="small" color="#FCD34D" />
                      <Text style={[styles.costText, { marginLeft: 6 }]}>Fiyat tahmini hesaplanıyor...</Text>
                    </View>
                  )}
                  <TouchableOpacity style={styles.createJobBtn} onPress={() => handleCreateJob(item.report!.category, item.report!.description, item.report!.subCategory)} activeOpacity={0.85}>
                    <LinearGradient colors={['#0D9488', '#2DD4BF']} style={styles.createJobBtnGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                      <Ionicons name="flash" size={15} color="#FFF" style={{ marginRight: 6 }} />
                      <Text style={styles.createJobBtnText}>Tek Tıkla İlan Oluştur</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </LinearGradient>
              </View>
            )}

            {item.issues && item.issues.length > 0 && (
              <View style={styles.issuesSection}>
                <View style={styles.issuesSectionHeader}>
                  <View>
                    <Text style={styles.issuesEyebrow}>AI DEĞERLENDİRMESİ</Text>
                    <Text style={styles.issuesHeading}>
                      {item.issues.length === 1 ? '1 konu belirlendi' : `${item.issues.length} ayrı konu belirlendi`}
                    </Text>
                  </View>
                  <View style={styles.issuesCountBadge}>
                    <Text style={styles.issuesCountText}>{item.issues.length}</Text>
                  </View>
                </View>

                {item.issues.map((issue, issueIndex) => {
                  const severity = severityPresentation(issue.severity);
                  return (
                    <View key={`${item.id}-${issue.id}`} style={styles.issueCard}>
                      <View style={styles.issueTopRow}>
                        <View style={styles.issueNumber}>
                          <Text style={styles.issueNumberText}>{issueIndex + 1}</Text>
                        </View>
                        <View style={styles.issueTitleWrap}>
                          <Text style={styles.issueCategory}>{issue.category}</Text>
                          <Text style={styles.issueTitle}>{issue.title}</Text>
                        </View>
                        <View style={[styles.severityBadge, { backgroundColor: severity.background }]}>
                          <Ionicons name={severity.icon} size={12} color={severity.color} />
                          <Text style={[styles.severityText, { color: severity.color }]}>{severity.label}</Text>
                        </View>
                      </View>

                      <Text style={styles.issueDescription}>{issue.description}</Text>

                      {issue.safetyAction ? (
                        <View style={styles.safetyActionBox}>
                          <Ionicons name="shield-checkmark" size={16} color="#FBBF24" />
                          <Text style={styles.safetyActionText}>{issue.safetyAction}</Text>
                        </View>
                      ) : null}

                      {isLastMessage && issueIndex === 0 && showCostCard && costEstimate?.found ? (
                        <View style={styles.costRow}>
                          <Ionicons name="wallet-outline" size={15} color="#FCD34D" />
                          <Text style={styles.costText}>Tahmini aralık: <Text style={styles.costAmount}>{costEstimate.label}</Text></Text>
                        </View>
                      ) : null}

                      {!isElectrician && (
                        <TouchableOpacity
                          style={styles.issueAction}
                          onPress={() => handleCreateJob(issue.category, issue.description, issue.subCategory)}
                          activeOpacity={0.85}
                        >
                          <Text style={styles.issueActionText}>Bu konu için ilan oluştur</Text>
                          <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })}
                <Text style={styles.aiDisclaimer}>AI değerlendirmesi ön bilgilendirme amaçlıdır; kesin teşhis için yerinde uzman kontrolü gerekir.</Text>
              </View>
            )}

            {/* Quote Card (Usta teklif) */}
            {item.quote && (
              <View style={styles.quoteCard}>
                <LinearGradient colors={['rgba(59, 130, 246, 0.12)', 'rgba(99, 102, 241, 0.04)']} style={styles.reportGradient}>
                  <View style={styles.reportHeader}>
                    <View style={[styles.reportBadge, { borderColor: 'rgba(96, 165, 250, 0.3)', backgroundColor: 'rgba(96, 165, 250, 0.12)' }]}>
                      <Ionicons name="document-text" size={14} color="#60A5FA" />
                      <Text style={[styles.reportBadgeText, { color: '#60A5FA' }]}>Profesyonel Teklif</Text>
                    </View>
                  </View>
                  {item.quote.items.map((qi, idx) => (
                    <View key={idx} style={styles.quoteItemRow}>
                      <Text style={styles.quoteItemDesc}>{qi.desc}</Text>
                      <Text style={styles.quoteItemAmount}>{qi.amount.toLocaleString('tr-TR')} TL</Text>
                    </View>
                  ))}
                  <View style={styles.quoteTotalRow}>
                    <Text style={styles.quoteTotalLabel}>TOPLAM</Text>
                    <Text style={styles.quoteTotalAmount}>{item.quote.total.toLocaleString('tr-TR')} TL</Text>
                  </View>
                  {item.quote.note ? <Text style={styles.quoteNote}>{item.quote.note}</Text> : null}
                  {item.quote.validity ? <Text style={styles.quoteValidity}>{item.quote.validity}</Text> : null}
                  <TouchableOpacity
                    style={[styles.createJobBtn, { marginTop: 6 }]}
                    onPress={() => {
                      const lines = item.quote!.items.map(qi => `• ${qi.desc}: ${qi.amount.toLocaleString('tr-TR')} TL`);
                      const fullText = lines.join('\n') + `\n\nToplam: ${item.quote!.total.toLocaleString('tr-TR')} TL\n${item.quote!.note}\n${item.quote!.validity}`;
                      handleCopyToClipboard(fullText, 'Teklif');
                    }}
                    activeOpacity={0.85}
                  >
                    <LinearGradient colors={['#3B82F6', '#6366F1']} style={styles.createJobBtnGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                      <Ionicons name="copy" size={15} color="#FFF" style={{ marginRight: 6 }} />
                      <Text style={styles.createJobBtnText}>Teklifi Kopyala</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </LinearGradient>
              </View>
            )}

            {/* Message Template Card */}
            {item.messageTemplate && (
              <View style={styles.msgTemplateCard}>
                <LinearGradient colors={['rgba(168, 85, 247, 0.12)', 'rgba(139, 92, 246, 0.04)']} style={styles.reportGradient}>
                  <View style={styles.reportHeader}>
                    <View style={[styles.reportBadge, { borderColor: 'rgba(168, 85, 247, 0.3)', backgroundColor: 'rgba(168, 85, 247, 0.12)' }]}>
                      <Ionicons name="mail" size={14} color="#A855F7" />
                      <Text style={[styles.reportBadgeText, { color: '#A855F7' }]}>Hazır Mesaj</Text>
                    </View>
                  </View>
                  <Text style={styles.msgTemplateText}>{item.messageTemplate.message}</Text>
                  <TouchableOpacity
                    style={[styles.createJobBtn, { marginTop: 8 }]}
                    onPress={() => handleCopyToClipboard(item.messageTemplate!.message, 'Mesaj')}
                    activeOpacity={0.85}
                  >
                    <LinearGradient colors={['#A855F7', '#8B5CF6']} style={styles.createJobBtnGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                      <Ionicons name="copy" size={15} color="#FFF" style={{ marginRight: 6 }} />
                      <Text style={styles.createJobBtnText}>Mesajı Kopyala</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </LinearGradient>
              </View>
            )}
          </View>
        </View>
        {/* Scenario cards for both roles */}
        {item.id === 'welcome' && (
          <View style={styles.scenarioContainer}>
            {(isElectrician ? USTA_SCENARIOS : EXAMPLE_SCENARIOS).map((s, i) => (
              <TouchableOpacity key={i} style={styles.scenarioCard} onPress={() => handleChipPress(s.text)} activeOpacity={0.8}>
                <Text style={styles.scenarioIcon}>{s.icon}</Text>
                <Text style={styles.scenarioText}>{s.text}</Text>
                <Ionicons name="chevron-forward" size={14} color="#64748B" />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    );
  };

  const bgStyle = isElectrician ? '#0F172A' : '#0B131F';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: bgStyle }]}>
      {/* Hide the native stack header; keep the system status bar visible. */}
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar hidden={false} barStyle="light-content" backgroundColor={bgStyle} />
      
      {/* Custom Premium Header bar */}
      <View style={[
        styles.header, 
        isElectrician ? styles.headerUsta : styles.headerCitizen,
        { paddingTop: Math.max(insets.top, 20) }
      ]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>
            {isElectrician ? 'AI Teknik Kılavuz' : 'Arıza Teşhis Sihirbazı'}
          </Text>
          <Text style={[styles.headerSubtitle, { color: isElectrician ? '#E5C158' : '#2DD4BF' }]}>
            {isElectrician ? 'Teknik Asistan & Teklif Desteği' : 'Akıllı Yapay Zeka Destekli'}
          </Text>
        </View>
        
        <TouchableOpacity style={styles.newChatBtn} onPress={handleNewConversation} activeOpacity={0.8}>
          <Ionicons name="add" size={17} color={isElectrician ? '#FDE68A' : '#5EEAD4'} />
          <Text style={[styles.newChatText, { color: isElectrician ? '#FDE68A' : '#5EEAD4' }]}>Yeni</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.capabilityBar}>
        <View style={styles.onlineDot} />
        <Text style={styles.capabilityText}>
          {isElectrician ? 'Teknik analiz  •  Teklif  •  Müşteri mesajı' : 'Çoklu arıza  •  Fotoğraflı analiz  •  Güvenlik önceliği'}
        </Text>
        <Ionicons name="shield-checkmark-outline" size={15} color="#64748B" />
      </View>
      
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
        
        {/* Generating state typing indicator */}
        {isLoading && (
          <View style={styles.typingIndicatorRow}>
            <View style={styles.avatarCircleSmall}>
              <Ionicons name="sparkles" size={12} color="#94A3B8" />
            </View>
            <View style={styles.typingBubble}>
              <Animated.View style={[styles.typingDot, { opacity: dot1Opacity }]} />
              <Animated.View style={[styles.typingDot, { opacity: dot2Opacity }]} />
              <Animated.View style={[styles.typingDot, { opacity: dot3Opacity }]} />
            </View>
          </View>
        )}
        
        {/* Floating Input Pill bar */}
        <View style={[styles.inputContainerOuter, { paddingBottom: Math.max(insets.bottom, 12) }]}>

          {/* Quick Reply Chips */}
          {showChips && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll} style={styles.chipsRow}>
              {(isElectrician ? USTA_CHIPS : CITIZEN_CHIPS).map((chip, i) => (
                <TouchableOpacity key={i} style={styles.chip} onPress={() => handleChipPress(chip.label)} activeOpacity={0.75}>
                  <Text style={styles.chipIcon}>{chip.icon}</Text>
                  <Text style={styles.chipLabel}>{chip.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {selectedImage && (
            <View style={styles.previewContainer}>
              <View style={styles.previewImageWrapper}>
                <Image source={{ uri: selectedImage }} style={styles.previewImage} />
                <TouchableOpacity style={styles.removeImageBtn} onPress={handleRemoveImage}>
                  <Ionicons name="close-circle" size={20} color="#F87171" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          <View style={styles.inputBarFloating}>
            {!isElectrician && (
              <TouchableOpacity style={styles.attachBtn} onPress={handleAttachPress} disabled={isLoading || isPickingImage}>
                {isPickingImage ? (
                  <ActivityIndicator size="small" color="#94A3B8" />
                ) : (
                  <Ionicons name="camera" size={20} color="#94A3B8" />
                )}
              </TouchableOpacity>
            )}
            <TextInput
              style={styles.textInput}
              value={inputText}
              onChangeText={setInputText}
              placeholder={isElectrician ? "Teknik soru sorun..." : "Arızanızı anlatın veya fotoğraf ekleyin..."}
              placeholderTextColor="#64748B"
              multiline
              maxLength={1200}
            />
            <TouchableOpacity
              style={[
                styles.sendBtn,
                { backgroundColor: isElectrician ? '#4682B4' : '#0D9488' },
                (!inputText.trim() && !selectedImage) && styles.sendBtnDisabled
              ]}
              onPress={() => handleSend()}
              disabled={(!inputText.trim() && !selectedImage) || isLoading}
            >
              <Ionicons name="send" size={16} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 13,
    borderBottomWidth: 1,
  },
  headerCitizen: {
    backgroundColor: '#0B131F',
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  headerUsta: {
    backgroundColor: '#0F172A',
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  backBtn: {
    padding: 6,
    marginRight: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: fonts.bold,
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    fontSize: 11,
    fontFamily: fonts.bold,
    marginTop: 1,
  },
  newChatBtn: {
    height: 34,
    paddingHorizontal: 11,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  newChatText: { fontFamily: fonts.bold, fontSize: 11.5, marginLeft: 3 },
  capabilityBar: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
    backgroundColor: 'rgba(255, 255, 255, 0.018)',
  },
  onlineDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#2DD4BF', marginRight: 8 },
  capabilityText: { flex: 1, color: '#94A3B8', fontFamily: fonts.medium, fontSize: 10.5 },
  listContent: {
    padding: 12,
    paddingBottom: 24,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 12,
    width: '100%',
  },
  userRow: {
    justifyContent: 'flex-end',
  },
  modelRow: {
    justifyContent: 'flex-start',
  },
  avatarCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    marginTop: 1,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  avatarCircleSmall: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  bubble: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 9,
    maxWidth: '82%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  userBubble: {
    borderBottomRightRadius: 4,
    shadowColor: '#000',
    shadowOpacity: 0.12,
  },
  modelBubble: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  bubbleText: {
    fontSize: 13.5,
    lineHeight: 19.5,
  },
  userBubbleText: {
    color: '#FFFFFF',
    fontFamily: fonts.medium,
    fontSize: 13.5,
    lineHeight: 19.5,
  },
  modelBubbleText: {
    color: '#E2E8F0',
    fontFamily: fonts.regular,
    fontSize: 13.5,
    lineHeight: 19.5,
  },
  boldUser: { fontFamily: fonts.bold, color: '#FFFFFF' },
  boldModel: { fontFamily: fonts.bold, color: '#FFFFFF' },
  bulletRow: { flexDirection: 'row', marginBottom: 3, paddingRight: 4 },
  bulletDotUser: { color: '#FFFFFF', fontFamily: fonts.bold, fontSize: 13.5, marginRight: 6, lineHeight: 19.5 },
  bulletDotModel: { color: '#2DD4BF', fontFamily: fonts.bold, fontSize: 13.5, marginRight: 6, lineHeight: 19.5 },
  bulletTextUser: { flex: 1, color: '#FFFFFF', fontFamily: fonts.regular, fontSize: 13.5, lineHeight: 19.5 },
  bulletTextModel: { flex: 1, color: '#E2E8F0', fontFamily: fonts.regular, fontSize: 13.5, lineHeight: 19.5 },
  warningContainer: { padding: 1 },
  warningHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  warningTitle: { color: '#F87171', fontFamily: fonts.bold, fontSize: 13.5, marginLeft: 6, letterSpacing: 0.2 },
  warningText: { color: '#FEE2E2', fontFamily: fonts.medium, fontSize: 13.5, lineHeight: 19 },
  emergencyBanner: { maxWidth: '92%', backgroundColor: 'rgba(239, 68, 68, 0.12)', borderWidth: 1.5, borderColor: 'rgba(239, 68, 68, 0.4)', borderRadius: 16, padding: 12, marginBottom: 4 },
  emergencyHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  emergencyTitle: { color: '#FF4444', fontFamily: fonts.bold, fontSize: 14, marginLeft: 6, letterSpacing: 0.3 },
  emergencyText: { color: '#FCA5A5', fontFamily: fonts.medium, fontSize: 13.5, lineHeight: 19, marginBottom: 10 },
  emergencyBtn: { backgroundColor: '#DC2626', borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 9, paddingHorizontal: 14 },
  emergencyBtnText: { color: '#FFFFFF', fontFamily: fonts.bold, fontSize: 12.5 },
  reportCard: {
    width: '92%',
    marginTop: 8,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(45, 212, 191, 0.23)',
    elevation: 3,
    shadowColor: '#2DD4BF',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },
  reportGradient: {
    padding: 12,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reportBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(45, 212, 191, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(45, 212, 191, 0.18)',
  },
  reportBadgeText: {
    color: '#2DD4BF',
    fontFamily: fonts.bold,
    fontSize: 10,
    marginLeft: 4,
  },
  reportTitle: {
    fontSize: 14.5,
    fontFamily: fonts.bold,
    color: '#FFFFFF',
    marginBottom: 4,
    letterSpacing: -0.1,
  },
  reportDesc: {
    fontSize: 12,
    fontFamily: fonts.medium,
    color: '#99F6E4',
    lineHeight: 17,
    marginBottom: 10,
    opacity: 0.9,
  },
  issuesSection: { width: '94%', marginTop: 9 },
  issuesSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 9,
    paddingHorizontal: 2,
  },
  issuesEyebrow: { color: '#5EEAD4', fontFamily: fonts.bold, fontSize: 9.5, letterSpacing: 1.1 },
  issuesHeading: { color: '#F8FAFC', fontFamily: fonts.bold, fontSize: 15, marginTop: 2 },
  issuesCountBadge: {
    width: 31,
    height: 31,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(45, 212, 191, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(45, 212, 191, 0.24)',
  },
  issuesCountText: { color: '#5EEAD4', fontFamily: fonts.bold, fontSize: 14 },
  issueCard: {
    padding: 13,
    marginBottom: 9,
    borderRadius: 16,
    backgroundColor: '#111C2E',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.14)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 8,
    elevation: 2,
  },
  issueTopRow: { flexDirection: 'row', alignItems: 'flex-start' },
  issueNumber: {
    width: 26,
    height: 26,
    borderRadius: 9,
    backgroundColor: 'rgba(45, 212, 191, 0.13)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
  },
  issueNumberText: { color: '#5EEAD4', fontFamily: fonts.bold, fontSize: 12 },
  issueTitleWrap: { flex: 1, paddingRight: 6 },
  issueCategory: { color: '#64748B', fontFamily: fonts.bold, fontSize: 9.5, textTransform: 'uppercase', letterSpacing: 0.7 },
  issueTitle: { color: '#F8FAFC', fontFamily: fonts.bold, fontSize: 14, lineHeight: 18, marginTop: 2 },
  severityBadge: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 5 },
  severityText: { fontFamily: fonts.bold, fontSize: 9.5, marginLeft: 3 },
  issueDescription: { color: '#CBD5E1', fontFamily: fonts.regular, fontSize: 12.5, lineHeight: 18, marginTop: 10 },
  safetyActionBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 9,
    marginTop: 9,
    borderRadius: 11,
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.16)',
  },
  safetyActionText: { flex: 1, color: '#FDE68A', fontFamily: fonts.medium, fontSize: 11.5, lineHeight: 16, marginLeft: 7 },
  issueAction: {
    minHeight: 40,
    borderRadius: 12,
    backgroundColor: '#0D9488',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 13,
    marginTop: 10,
  },
  issueActionText: { color: '#FFFFFF', fontFamily: fonts.bold, fontSize: 12 },
  aiDisclaimer: { color: '#64748B', fontFamily: fonts.regular, fontSize: 9.5, lineHeight: 14, paddingHorizontal: 4, marginTop: 1 },
  createJobBtn: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  createJobBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  createJobBtnText: {
    color: '#FFFFFF',
    fontFamily: fonts.bold,
    fontSize: 12.5,
    letterSpacing: 0.2,
  },
  typingIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#94A3B8',
    marginHorizontal: 2.5,
  },
  inputContainerOuter: {
    backgroundColor: 'rgba(11, 19, 31, 0.96)',
    paddingTop: 7,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  inputBarFloating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#131E31',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  textInput: {
    flex: 1,
    color: '#FFFFFF',
    fontFamily: fonts.regular,
    fontSize: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
    maxHeight: 90,
    textAlignVertical: 'center',
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
  previewContainer: {
    paddingHorizontal: 20,
    marginBottom: 8,
    flexDirection: 'row',
  },
  previewImageWrapper: {
    position: 'relative',
    width: 60,
    height: 60,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#0D9488',
    overflow: 'visible',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    borderRadius: 6,
  },
  removeImageBtn: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#0F172A',
    borderRadius: 10,
    elevation: 3,
  },
  attachBtn: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  messageImage: {
    width: 200,
    height: 150,
    borderRadius: 12,
    marginBottom: 6,
  },
  // Cost estimate row inside report card
  costRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(252, 211, 77, 0.08)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(252, 211, 77, 0.15)' },
  costText: { color: '#FDE68A', fontFamily: fonts.medium, fontSize: 12, marginLeft: 6 },
  costAmount: { fontFamily: fonts.bold, color: '#FCD34D' },
  // Scenario cards below welcome message
  scenarioContainer: { paddingLeft: 38, paddingRight: 12, marginBottom: 8 },
  scenarioCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(45, 212, 191, 0.15)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 6 },
  scenarioIcon: { fontSize: 18, marginRight: 10 },
  scenarioText: { flex: 1, color: '#CBD5E1', fontFamily: fonts.medium, fontSize: 13, lineHeight: 18 },
  // Quick reply chips
  chipsRow: { marginBottom: 8 },
  chipsScroll: { paddingHorizontal: 16 },
  chip: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7, marginRight: 8 },
  chipIcon: { fontSize: 15, marginRight: 5 },
  chipLabel: { color: '#CBD5E1', fontFamily: fonts.medium, fontSize: 12.5 },
  // Quote Card (Usta Teklif)
  quoteCard: { width: '92%', marginTop: 8, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(96, 165, 250, 0.23)', elevation: 3, shadowColor: '#3B82F6', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 6 },
  quoteItemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.06)' },
  quoteItemDesc: { flex: 1, color: '#CBD5E1', fontFamily: fonts.regular, fontSize: 12.5, lineHeight: 17, marginRight: 8 },
  quoteItemAmount: { color: '#93C5FD', fontFamily: fonts.bold, fontSize: 13 },
  quoteTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingTop: 8, borderTopWidth: 1.5, borderTopColor: 'rgba(96, 165, 250, 0.25)' },
  quoteTotalLabel: { color: '#60A5FA', fontFamily: fonts.bold, fontSize: 12, letterSpacing: 1 },
  quoteTotalAmount: { color: '#FFFFFF', fontFamily: fonts.bold, fontSize: 16 },
  quoteNote: { color: '#94A3B8', fontFamily: fonts.regular, fontSize: 11, marginTop: 8, lineHeight: 15 },
  quoteValidity: { color: '#64748B', fontFamily: fonts.regular, fontSize: 10.5, marginTop: 2, fontStyle: 'italic' },
  // Message Template Card (Usta Hazır Mesaj)
  msgTemplateCard: { width: '92%', marginTop: 8, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(168, 85, 247, 0.23)', elevation: 3, shadowColor: '#A855F7', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 6 },
  msgTemplateText: { color: '#E2E8F0', fontFamily: fonts.regular, fontSize: 13, lineHeight: 19, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  // Bubble copy button
  bubbleFooter: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 6, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', paddingTop: 4 },
  bubbleCopyBtn: { flexDirection: 'row', alignItems: 'center', opacity: 0.8, paddingVertical: 2, paddingHorizontal: 6, borderRadius: 4 },
  bubbleCopyText: { color: '#94A3B8', fontFamily: fonts.medium, fontSize: 11, marginLeft: 4 },
});
