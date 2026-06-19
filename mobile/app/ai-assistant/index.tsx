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
  StatusBar
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppColors } from '../../hooks/useAppColors';
import { fonts } from '../../constants/typography';
import { aiService, ChatMessage } from '../../services/aiService';

interface MessageItem {
  id: string;
  role: 'user' | 'model';
  text: string;
  report?: {
    category: string;
    title: string;
    description: string;
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
  const flatListRef = useRef<FlatList>(null);
  
  // Typing indicator animation state
  const dot1Opacity = useRef(new Animated.Value(0.3)).current;
  const dot2Opacity = useRef(new Animated.Value(0.3)).current;
  const dot3Opacity = useRef(new Animated.Value(0.3)).current;

  // Initialize with welcome message
  useEffect(() => {
    const welcomeText = isElectrician
      ? 'Merhaba Usta! Ben İşBitir AI Teknik Kılavuz Asistanı. Teknik konularda, hata kodlarında, malzeme hesaplamalarında veya müşteri teklif şablonu hazırlamada size yardımcı olabilirim. Nasıl yardımcı olabilirim?'
      : 'Merhaba! Ben İşBitir Akıllı Arıza Teşhis Sihirbazıyım. Evinizde veya iş yerinizde yaşadığınız arızayı bana kısaca tarif edebilirseniz, size olası nedenleri söyleyebilir, güvenlik önlemlerini aktarabilir ve tek tıkla ilan oluşturmanıza yardımcı olabilirim. Sorununuz nedir?';
      
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

  // Helper to parse potential [TEŞHİS RAPORU] blocks
  const parseReportBlock = (text: string) => {
    const marker = '[TEŞHİS RAPORU]';
    if (!text.includes(marker)) return { cleanText: text, report: undefined };
    
    try {
      const parts = text.split(marker);
      const cleanText = parts[0].trim();
      const jsonCandidate = parts[1].trim();
      
      // Parse JSON from code blocks or raw text
      const cleanJsonString = jsonCandidate
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();
        
      const reportObj = JSON.parse(cleanJsonString);
      if (reportObj && reportObj.category) {
        return {
          cleanText,
          report: {
            category: reportObj.category,
            title: reportObj.title || 'Arıza İlanı',
            description: reportObj.description || ''
          }
        };
      }
    } catch (e) {
      console.warn('Failed to parse diagnostic block JSON:', e);
    }
    return { cleanText: text, report: undefined };
  };

  const handleSend = async () => {
    if (!inputText.trim() || isLoading) return;
    
    const userMsgText = inputText.trim();
    setInputText('');
    
    // Add user message to local state
    const userMessage: MessageItem = {
      id: Date.now().toString(),
      role: 'user',
      text: userMsgText
    };
    
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    
    // Scroll list to end
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    
    setIsLoading(true);
    
    try {
      // Map message history to send to backend
      const history: ChatMessage[] = updatedMessages
        .slice(1) // exclude first welcome message
        .map(m => ({
          role: m.role,
          text: m.text
        }));
        
      const response = await aiService.sendMessage(userMsgText, history);
      
      // Parse backend response for any [TEŞHİS RAPORU] block
      const { cleanText, report } = parseReportBlock(response.text);
      
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'model',
          text: cleanText,
          report
        }
      ]);
      
    } catch (error) {
      console.error('AI chat failed:', error);
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'model',
          text: 'Üzgünüm, şu anda bağlantı kuramıyorum. Lütfen internet bağlantınızı kontrol edip tekrar deneyin.'
        }
      ]);
    } finally {
      setIsLoading(false);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const handleCreateJob = (category: string, description: string) => {
    router.push({
      pathname: '/jobs/quick-create',
      params: {
        category,
        description
      }
    });
  };

  const renderMessage = ({ item }: { item: MessageItem }) => {
    const isUser = item.role === 'user';
    const textContent = item.text;
    
    // Detect safety warning block
    const hasSafetyWarning = textContent.includes('⚠️ UYARI') || textContent.includes('⚠️ ÖNEMLİ') || textContent.includes('GÜVENLİK UYARISI');

    return (
      <View style={[styles.messageRow, isUser ? styles.userRow : styles.modelRow]}>
        {!isUser && (
          <View style={[styles.avatarCircle, { backgroundColor: isElectrician ? '#2E5C8A' : '#0D9488' }]}>
            <Ionicons name={isElectrician ? "hammer" : "sparkles"} size={14} color="#FFF" />
          </View>
        )}
        
        <View style={{ flex: 1, alignItems: isUser ? 'flex-end' : 'flex-start' }}>
          <View style={[
            styles.bubble, 
            isUser 
              ? [styles.userBubble, { backgroundColor: isElectrician ? '#2E5C8A' : '#115E59' }] 
              : styles.modelBubble
          ]}>
            {hasSafetyWarning && !isUser ? (
              <View style={styles.warningContainer}>
                <View style={styles.warningHeader}>
                  <Ionicons name="warning" size={18} color="#F87171" />
                  <Text style={styles.warningTitle}>GÜVENLİK UYARISI</Text>
                </View>
                <Text style={styles.warningText}>{textContent}</Text>
              </View>
            ) : (
              <Text style={[styles.bubbleText, isUser ? styles.userBubbleText : styles.modelBubbleText]}>
                {textContent}
              </Text>
            )}
          </View>
          
          {/* Diagnostic Report Card render (Citizen only) */}
          {item.report && (
            <View style={styles.reportCard}>
              <LinearGradient
                colors={['rgba(13, 148, 136, 0.1)', 'rgba(45, 212, 191, 0.04)']}
                style={styles.reportGradient}
              >
                <View style={styles.reportHeader}>
                  <View style={styles.reportBadge}>
                    <Ionicons name="ribbon" size={14} color="#2DD4BF" />
                    <Text style={styles.reportBadgeText}>Akıllı Teşhis Raporu</Text>
                  </View>
                </View>
                <Text style={styles.reportTitle}>{item.report.title}</Text>
                <Text style={styles.reportDesc}>{item.report.description}</Text>
                
                <TouchableOpacity
                  style={styles.createJobBtn}
                  onPress={() => handleCreateJob(item.report!.category, item.report!.description)}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={['#0D9488', '#2DD4BF']}
                    style={styles.createJobBtnGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Ionicons name="flash" size={15} color="#FFF" style={{ marginRight: 6 }} />
                    <Text style={styles.createJobBtnText}>Tek Tıkla İlan Oluştur</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </LinearGradient>
            </View>
          )}
        </View>
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
          <View style={styles.inputBarFloating}>
            <TextInput
              style={styles.textInput}
              value={inputText}
              onChangeText={setInputText}
              placeholder={isElectrician ? "Teknik soru sorun veya şablon isteyin..." : "Arızayı tarif edin (örn: Prizden ses geliyor)..."}
              placeholderTextColor="#64748B"
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[
                styles.sendBtn, 
                { backgroundColor: isElectrician ? '#4682B4' : '#0D9488' },
                !inputText.trim() && styles.sendBtnDisabled
              ]}
              onPress={handleSend}
              disabled={!inputText.trim() || isLoading}
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
  },
  modelBubbleText: {
    color: '#E2E8F0',
    fontFamily: fonts.regular,
  },
  warningContainer: {
    padding: 1,
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  warningTitle: {
    color: '#F87171',
    fontFamily: fonts.bold,
    fontSize: 13.5,
    marginLeft: 6,
    letterSpacing: 0.2,
  },
  warningText: {
    color: '#FEE2E2',
    fontFamily: fonts.medium,
    fontSize: 13.5,
    lineHeight: 19,
  },
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
  }
});
