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
import { useAppColors } from '../../hooks/useAppColors';
import { fonts } from '../../constants/typography';
import { aiService, ChatMessage, CostEstimate } from '../../services/aiService';

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
          <Text key={pi} style={isUser ? styles.boldUser : styles.boldModel}>
            {part.slice(2, -2)}
          </Text>
        );
      }
      return <Text key={pi}>{part}</Text>;
    });
    const isBullet = line.trimStart().startsWith('- ') || line.trimStart().startsWith('• ');
    const isNumbered = /^\d+\./.test(line.trimStart());
    if (isBullet) {
      return (
        <View key={idx} style={styles.bulletRow}>
          <Text style={isUser ? styles.bulletDotUser : styles.bulletDotModel}>•</Text>
          <Text style={isUser ? styles.bulletTextUser : styles.bulletTextModel}>
            {line.replace(/^[\s\-•]+/, '')}
          </Text>
        </View>
      );
    }
    if (isNumbered) {
      return (
        <View key={idx} style={styles.bulletRow}>
          <Text style={isUser ? styles.bulletDotUser : styles.bulletDotModel}>
            {line.match(/^\d+\./)?.[0]}
          </Text>
          <Text style={isUser ? styles.bulletTextUser : styles.bulletTextModel}>
            {line.replace(/^\d+\.\s*/, '')}
          </Text>
        </View>
      );
    }
    return (
      <Text key={idx} style={[isUser ? styles.userBubbleText : styles.modelBubbleText, { marginBottom: 2 }]}>
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

export default function AiAssistantScreen() {
  const router = useRouter();
  const colors = useAppColors();
  const params = useLocalSearchParams<{ role?: string }>();
  const insets = useSafeAreaInsets();
  
  // Determine role: default to CITIZEN if not specified
  const isElectrician = params.role === 'ELECTRICIAN';
  
  const [messages, setMessages] = useState<MessageItem[]>([]);
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
    const welcomeText = isElectrician
      ? 'Merhaba Usta! Ben İşBitir AI Teknik Kılavuz Asistanı. Teknik konularda, hata kodlarında, malzeme hesaplamalarında veya müşteri teklif şablonu hazırlamada size yardımcı olabilirim. Nasıl yardımcı olabilirim?'
      : 'Merhaba! Ben İşBitir Akıllı Arıza Teşhis Asistanıyım 👋\n\nEvinizde veya iş yerinizde yaşadığınız arızayı bana anlatın. Size olası nedenleri söyleyip güvenlik önlemlerini paylaşır, tek tıkla usta bulmanıza yardımcı olurum.\n\nAşağıdaki örneklerden birini seçebilir veya kendiniz yazabilirsiniz:';
      
    setMessages([
      {
        id: 'welcome',
        role: 'model',
        text: welcomeText
      }
    ]);
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
  }, [isLoading]);

  // Parse AI response for structured blocks: [TEŞHİS RAPORU], [TEKLİF ŞABLONU], [MESAJ ŞABLONU]
  const parseResponseBlocks = (text: string) => {
    let cleanText = text;
    let report: MessageItem['report'] = undefined;
    let quote: MessageItem['quote'] = undefined;
    let messageTemplate: MessageItem['messageTemplate'] = undefined;

    // Parse [TEŞHİS RAPORU]
    const reportMarker = '[TEŞHİS RAPORU]';
    if (cleanText.includes(reportMarker)) {
      try {
        const parts = cleanText.split(reportMarker);
        cleanText = parts[0].trim();
        const jsonStr = parts[1].trim().replace(/```json/g, '').replace(/```/g, '').trim();
        const obj = JSON.parse(jsonStr);
        if (obj?.category) {
          report = { category: obj.category, subCategory: obj.subCategory, title: obj.title || 'Arıza İlanı', description: obj.description || '' };
        }
      } catch {}
    }

    // Parse [TEKLİF ŞABLONU]
    const quoteMarker = '[TEKLİF ŞABLONU]';
    if (cleanText.includes(quoteMarker)) {
      try {
        const parts = cleanText.split(quoteMarker);
        cleanText = parts[0].trim();
        const jsonStr = parts[1].trim().replace(/```json/g, '').replace(/```/g, '').trim();
        const obj = JSON.parse(jsonStr);
        if (obj?.items && obj?.total) {
          quote = { items: obj.items, total: obj.total, note: obj.note || '', validity: obj.validity || '' };
        }
      } catch {}
    }

    // Parse [MESAJ ŞABLONU]
    const msgMarker = '[MESAJ ŞABLONU]';
    if (cleanText.includes(msgMarker)) {
      try {
        const parts = cleanText.split(msgMarker);
        cleanText = parts[0].trim();
        const jsonStr = parts[1].trim().replace(/```json/g, '').replace(/```/g, '').trim();
        const obj = JSON.parse(jsonStr);
        if (obj?.message) {
          messageTemplate = { type: obj.type || 'genel', message: obj.message };
        }
      } catch {}
    }

    return { cleanText, report, quote, messageTemplate };
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
      const history: ChatMessage[] = updatedMessages
        .slice(1)
        .map(m => ({ role: m.role, text: m.text }));
        
      const imagePayload = currentImageBase64 && currentImageMimeType ? {
        base64: currentImageBase64,
        mimeType: currentImageMimeType
      } : undefined;
        
      const response = await aiService.sendMessage(userMsgText, history, imagePayload);
      const { cleanText, report, quote, messageTemplate } = parseResponseBlocks(response.text);
      const isEmergency = cleanText.startsWith('🚨 ACİL') || cleanText.includes('🚨 ACİL:');
      
      setMessages(prev => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: 'model', text: cleanText, report, isEmergency, quote, messageTemplate }
      ]);

      // Auto-fetch cost estimate when a diagnosis is returned
      if (report?.category) {
        setIsFetchingCost(true);
        const est = await aiService.getCostEstimate(report.category);
        setCostEstimate(est);
        setShowCostCard(est.found);
        setIsFetchingCost(false);
      }
      
    } catch (error) {
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
    const isWelcome = item.id === 'welcome' && !isElectrician;
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
              </View>
            )}
            {item.report && (
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
      {/* Hide the top system navigation stack header and the phone clock/battery status bar */}
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar hidden={true} />
      
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
        
        <View style={styles.headerRightIcon}>
          <Ionicons 
            name={isElectrician ? "construct" : "sparkles"} 
            size={20} 
            color={isElectrician ? "#E5C158" : "#2DD4BF"} 
          />
        </View>
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
              maxLength={500}
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
    paddingBottom: 16,
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
    fontSize: 16.5,
    fontFamily: fonts.bold,
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    fontSize: 11,
    fontFamily: fonts.bold,
    marginTop: 1,
  },
  headerRightIcon: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
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
    backgroundColor: 'transparent',
  },
  inputBarFloating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#111A2E',
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
});
