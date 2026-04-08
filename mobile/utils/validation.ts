// Form validation utilities

export const validateEmail = (email: string): string | null => {
  if (!email.trim()) {
    return 'Email gereklidir';
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return 'Geçerli bir email adresi giriniz';
  }

  // Yaygın yazım hataları kontrolü
  const lowerEmail = email.toLowerCase();

  // En sık yapılan global alan adı (domain uzantısı) hataları
  if (lowerEmail.endsWith('.con')) {
    return 'Uzanti .con olamaz, muhtemelen .com yazmak istediniz';
  }
  if (lowerEmail.endsWith('.cm')) {
    return 'Uzanti .cm olamaz, muhtemelen .com yazmak istediniz';
  }
  if (lowerEmail.endsWith('.cmo')) {
    return 'Uzanti .cmo olamaz, muhtemelen .com yazmak istediniz';
  }
  if (lowerEmail.endsWith('gamil.com') || lowerEmail.endsWith('gmal.com') || lowerEmail.endsWith('gmil.com') || lowerEmail.endsWith('gmail.co')) {
    return 'Muhtemelen gmail.com yazmak istediniz';
  }
  if (lowerEmail.endsWith('hotmial.com') || lowerEmail.endsWith('hotmal.com') || lowerEmail.endsWith('hotmail.co')) {
    return 'Muhtemelen hotmail.com yazmak istediniz';
  }
  if (lowerEmail.endsWith('outlok.com') || lowerEmail.endsWith('outlook.co')) {
    return 'Muhtemelen outlook.com yazmak istediniz';
  }
  if (lowerEmail.endsWith('yandex.co')) {
    return 'Muhtemelen yandex.com yazmak istediniz';
  }
  if (lowerEmail.endsWith('yahoo.co')) {
    return 'Muhtemelen yahoo.com yazmak istediniz';
  }
  if (lowerEmail.endsWith('icloud.co')) {
    return 'Muhtemelen icloud.com yazmak istediniz';
  }

  return null;
};

export const validatePassword = (password: string): string | null => {
  if (!password) {
    return 'Şifre gereklidir';
  }
  if (password.length < 6) {
    return 'Şifre en az 6 karakter olmalıdır';
  }
  return null;
};

export const validateRequired = (value: string, fieldName: string): string | null => {
  if (!value.trim()) {
    return `${fieldName} gereklidir`;
  }
  return null;
};

export const validatePhone = (phone: string): string | null => {
  if (!phone) return null;

  // Sadece rakamları al
  const digits = phone.replace(/\D/g, '');

  if (digits.length === 0) return null;

  if (!digits.startsWith('0')) {
    return 'Telefon numarası 0 ile başlamalıdır';
  }

  if (digits.length !== 11) {
    return 'Telefon numarası 11 haneli olmalıdır (Örn: 05xx xxx xx xx)';
  }

  return null;
};

export const containsPhoneNumber = (text: string | undefined | null): boolean => {
  if (!text) return false;
  const normalized = text.replace(/[\s\.\-\(\)]/g, '');
  const phoneRegex = /(05|5)\d{9}/;
  return phoneRegex.test(normalized);
};

/**
 * Anlamsız (gibberish) metin tespit edici.
 * İlan başlığı ve açıklama alanlarında sahte/spam içerikleri engeller.
 */
export const validateJobText = (text: string, fieldName: string = 'Metin', minLength: number = 10): string | null => {
  const trimmed = text.trim();

  // 1. Minimum uzunluk kontrolü
  if (trimmed.length < minLength) {
    return `${fieldName} en az ${minLength} karakter olmalıdır.`;
  }

  // 2. Tekrarlayan karakter kontrolü: "aaaa", "bbbbb", "11111" vb.
  if (/(.)\1{3,}/i.test(trimmed)) {
    return `Lütfen işinizi daha detaylı ve anlamlı bir şekilde açıklayın.`;
  }

  // 3. Klavye sırası (keyboard mash) kontrolü: "asdf", "qwerty", "zxcv", "123456" vb.
  const keyboardMashPatterns = [
    /qwert/i, /asdfg/i, /zxcvb/i, /yuiop/i, /hjklm/i,
    /qwerty/i, /azerty/i, /dvorak/i,
    /123456/i, /654321/i, /abcdef/i, /fedcba/i,
    /asd/i, /qwe/i, /zxc/i,
  ];
  for (const pattern of keyboardMashPatterns) {
    if (pattern.test(trimmed)) {
      return `Lütfen işinizi daha detaylı ve anlamlı bir şekilde açıklayın.`;
    }
  }

  // 4. Yalnızca sayılardan oluşan metin kontrolü: "123123", "999" vb.
  if (/^\d+$/.test(trimmed)) {
    return `Lütfen işinizi daha detaylı ve anlamlı bir şekilde açıklayın.`;
  }

  // 5. Benzersiz karakter çeşitliliği kontrolü (entropy)
  // Toplam karakter sayısının benzersiz olanların oranı çok düşükse anlamsızdır.
  const uniqueChars = new Set(trimmed.toLowerCase().replace(/\s/g, '')).size;
  const totalChars = trimmed.replace(/\s/g, '').length;
  if (totalChars > 6 && uniqueChars / totalChars < 0.2) {
    return `Lütfen işinizi daha detaylı ve anlamlı bir şekilde açıklayın.`;
  }

  // 6. Tekrarlayan kelime kontrolü: "tamam tamam tamam", "evet evet evet" vb.
  const words = trimmed.toLowerCase().split(/\s+/);
  if (words.length >= 3) {
    const uniqueWords = new Set(words).size;
    if (uniqueWords / words.length < 0.4) {
      return `Lütfen işinizi daha detaylı ve anlamlı bir şekilde açıklayın.`;
    }
  }

  return null;
};
