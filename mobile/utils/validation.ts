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
