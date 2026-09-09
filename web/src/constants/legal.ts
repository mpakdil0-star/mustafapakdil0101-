export const legalIdentity = {
  ready: process.env.NEXT_PUBLIC_LEGAL_READY === 'true',
  entityName: process.env.NEXT_PUBLIC_LEGAL_ENTITY_NAME?.trim() || '[Ticari unvan yayın öncesi eklenecektir]',
  address: process.env.NEXT_PUBLIC_LEGAL_ADDRESS?.trim() || '[Tebligata elverişli adres yayın öncesi eklenecektir]',
  legalEmail: process.env.NEXT_PUBLIC_LEGAL_EMAIL?.trim() || 'kvkk@isbitirapp.com',
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || 'destek@isbitirapp.com',
  updatedAt: '9 Eylül 2026',
};
