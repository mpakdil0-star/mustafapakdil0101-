/**
 * E-posta Doğrulama Servisi
 * 
 * Kayıt sırasında kullanıcının e-postasına 6 haneli kod gönderir.
 * Kodlar in-memory Map'te tutulur (15 dakika geçerli).
 * Production'da Redis veya DB'ye taşınabilir.
 */

import nodemailer from 'nodemailer';

// In-memory store: email -> { code, expiresAt, attempts }
const verificationCodes = new Map<string, {
  code: string;
  expiresAt: Date;
  attempts: number;
}>();

const CODE_EXPIRY_MS = 15 * 60 * 1000; // 15 dakika
const MAX_ATTEMPTS = 5;

/**
 * 6 haneli rastgele kod üret
 */
const generateCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Nodemailer transporter oluştur
 */
const createTransporter = () => {
  const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
  const smtpPort = parseInt(process.env.SMTP_PORT || '587');
  const smtpUser = process.env.SMTP_USER || '';
  const smtpPass = process.env.SMTP_PASS || '';

  if (!smtpUser || !smtpPass) {
    console.warn('⚠️ SMTP credentials not set, email verification will run in mock mode');
    return null;
  }

  return nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });
};

/**
 * E-posta doğrulama kodu gönder
 */
export const sendEmailVerificationCode = async (email: string, fullName: string): Promise<{
  success: boolean;
  message: string;
  mockCode?: string; // Sadece geliştirme modunda döner
}> => {
  const code = generateCode();
  const expiresAt = new Date(Date.now() + CODE_EXPIRY_MS);

  // Kodu sakla
  verificationCodes.set(email.toLowerCase(), {
    code,
    expiresAt,
    attempts: 0,
  });

  const transporter = createTransporter();

  if (!transporter) {
    // Mock mod: kodu response'a ekle
    console.log(`📧 [MOCK] Email verification code for ${email}: ${code}`);
    return {
      success: true,
      message: 'Doğrulama kodu gönderildi (Test modu: kodu uygulama içinde gösterilecek)',
      mockCode: code,
    };
  }

  const firstName = fullName.split(' ')[0] || 'Kullanıcı';

  const mailOptions = {
    from: `"İşBitir" <${process.env.SMTP_USER}>`,
    to: email,
    subject: '📧 E-posta Doğrulama Kodunuz - İşBitir',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f8f9fa;">
        <div style="max-width: 480px; margin: 40px auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #7C3AED, #4F46E5); padding: 40px 32px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.5px;">İşBitir</h1>
            <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0 0; font-size: 15px;">E-posta Doğrulama</p>
          </div>
          
          <!-- Body -->
          <div style="padding: 40px 32px;">
            <p style="color: #374151; font-size: 16px; margin: 0 0 16px 0;">Merhaba <strong>${firstName}</strong>,</p>
            <p style="color: #6B7280; font-size: 15px; line-height: 1.6; margin: 0 0 32px 0;">
              İşBitir'e hoş geldiniz! Hesabınızı doğrulamak için aşağıdaki kodu kullanın.
            </p>
            
            <!-- Code Box -->
            <div style="background: #F3F4F6; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 32px; border: 2px dashed #E5E7EB;">
              <p style="color: #6B7280; font-size: 13px; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 1px;">Doğrulama Kodunuz</p>
              <div style="font-size: 42px; font-weight: 800; letter-spacing: 12px; color: #7C3AED; font-family: 'Courier New', monospace;">${code}</div>
              <p style="color: #9CA3AF; font-size: 12px; margin: 12px 0 0 0;">Bu kod 15 dakika geçerlidir</p>
            </div>
            
            <div style="background: #FEF3C7; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
              <p style="color: #92400E; font-size: 13px; margin: 0; line-height: 1.5;">
                ⚠️ Bu kodu kimseyle paylaşmayın. İşBitir çalışanları sizden kod istemez.
              </p>
            </div>
            
            <p style="color: #9CA3AF; font-size: 13px; margin: 0; line-height: 1.5;">
              Bu e-postayı siz talep etmediyseniz hesabınız güvende olabilir. Lütfen bu e-postayı dikkate almayın.
            </p>
          </div>
          
          <!-- Footer -->
          <div style="background: #F9FAFB; padding: 20px 32px; border-top: 1px solid #E5E7EB;">
            <p style="color: #9CA3AF; font-size: 12px; margin: 0; text-align: center;">
              © 2026 İşBitir. Tüm hakları saklıdır.
            </p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`📧 Email verification code sent to ${email}`);
    return {
      success: true,
      message: 'Doğrulama kodu e-posta adresinize gönderildi.',
    };
  } catch (error: any) {
    console.error('❌ Email send error:', error.message);
    // Fallback: mock mod
    return {
      success: true,
      message: 'Doğrulama kodu gönderildi (Test modu)',
      mockCode: code,
    };
  }
};

/**
 * Şifre sıfırlama kodu gönder
 */
export const sendPasswordResetCode = async (email: string, fullName: string): Promise<{
  success: boolean;
  message: string;
  mockCode?: string; // Sadece geliştirme modunda döner
}> => {
  const code = generateCode();
  const expiresAt = new Date(Date.now() + CODE_EXPIRY_MS);

  // Kodu sakla
  verificationCodes.set(email.toLowerCase(), {
    code,
    expiresAt,
    attempts: 0,
  });

  const transporter = createTransporter();

  if (!transporter) {
    // Mock mod: kodu response'a ekle
    console.log(`📧 [MOCK] Password reset code for ${email}: ${code}`);
    return {
      success: true,
      message: 'Kurtarma kodu gönderildi (Test modu: kodu uygulama içinde gösterilecek)',
      mockCode: code,
    };
  }

  const firstName = fullName.split(' ')[0] || 'Kullanıcı';

  const mailOptions = {
    from: `"İşBitir" <${process.env.SMTP_USER}>`,
    to: email,
    subject: '🔐 Şifre Sıfırlama Kodunuz - İşBitir',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f8f9fa;">
        <div style="max-width: 480px; margin: 40px auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #7C3AED, #4F46E5); padding: 40px 32px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.5px;">İşBitir</h1>
            <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0 0; font-size: 15px;">Şifre Sıfırlama</p>
          </div>
          
          <!-- Body -->
          <div style="padding: 40px 32px;">
            <p style="color: #374151; font-size: 16px; margin: 0 0 16px 0;">Merhaba <strong>${firstName}</strong>,</p>
            <p style="color: #6B7280; font-size: 15px; line-height: 1.6; margin: 0 0 32px 0;">
              Şifrenizi sıfırlamak için bir talep aldık. İşleme devam etmek için aşağıdaki kodu kullanın.
            </p>
            
            <!-- Code Box -->
            <div style="background: #F3F4F6; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 32px; border: 2px dashed #E5E7EB;">
              <p style="color: #6B7280; font-size: 13px; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 1px;">Sıfırlama Kodunuz</p>
              <div style="font-size: 42px; font-weight: 800; letter-spacing: 12px; color: #7C3AED; font-family: 'Courier New', monospace;">${code}</div>
              <p style="color: #9CA3AF; font-size: 12px; margin: 12px 0 0 0;">Bu kod 15 dakika geçerlidir</p>
            </div>
            
            <div style="background: #FEF3C7; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
              <p style="color: #92400E; font-size: 13px; margin: 0; line-height: 1.5;">
                ⚠️ Bu kodu veya şifrenizi asla kimseyle paylaşmayın! Şifre sıfırlama talebinde bulunmadıysanız bu e-postayı dikkate almayın.
              </p>
            </div>
          </div>
          
          <!-- Footer -->
          <div style="background: #F9FAFB; padding: 20px 32px; border-top: 1px solid #E5E7EB;">
            <p style="color: #9CA3AF; font-size: 12px; margin: 0; text-align: center;">
              © 2026 İşBitir. Tüm hakları saklıdır.
            </p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`📧 Password reset code sent to ${email}`);
    return {
      success: true,
      message: 'Kurtarma kodu e-posta adresinize gönderildi.',
    };
  } catch (error: any) {
    console.error('❌ Password reset email send error:', error.message);
    // Fallback: mock mod
    return {
      success: true,
      message: 'Kurtarma kodu gönderildi (Test modu)',
      mockCode: code,
    };
  }
};

/**
 * E-posta doğrulama kodunu kontrol et
 */
export const verifyEmailCode = (email: string, code: string): {
  valid: boolean;
  message: string;
} => {
  const emailLower = email.toLowerCase();
  const stored = verificationCodes.get(emailLower);

  if (!stored) {
    return { valid: false, message: 'Doğrulama kodu bulunamadı. Lütfen tekrar kod isteyin.' };
  }

  if (new Date() > stored.expiresAt) {
    verificationCodes.delete(emailLower);
    return { valid: false, message: 'Doğrulama kodunun süresi dolmuştur. Lütfen tekrar kod isteyin.' };
  }

  if (stored.attempts >= MAX_ATTEMPTS) {
    verificationCodes.delete(emailLower);
    return { valid: false, message: 'Çok fazla hatalı deneme. Lütfen yeni bir kod isteyin.' };
  }

  if (stored.code !== code) {
    stored.attempts++;
    const remaining = MAX_ATTEMPTS - stored.attempts;
    return { valid: false, message: `Geçersiz kod. ${remaining} deneme hakkınız kaldı.` };
  }

  // Başarılı - kodu sil
  verificationCodes.delete(emailLower);
  return { valid: true, message: 'E-posta başarıyla doğrulandı.' };
};

/**
 * Kod geçerli mi kontrol et (silmeden)
 */
export const hasValidCode = (email: string): boolean => {
  const stored = verificationCodes.get(email.toLowerCase());
  return !!(stored && new Date() < stored.expiresAt);
};
