// Form validation utilities

export const validateEmail = (email: string): string | null => {
  if (!email.trim()) {
    return 'Email gereklidir';
  }
  if (!/\S+@\S+\.\S+/.test(email)) {
    return 'Geçerli bir email adresi giriniz';
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

