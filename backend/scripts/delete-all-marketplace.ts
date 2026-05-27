import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Tüm Pazar Yeri & İkinci El ilanları temizleniyor...');
  try {
    const result = await prisma.marketplaceProduct.deleteMany({});
    console.log(`✅ İşlem tamamlandı. Toplam ${result.count} adet ilan veritabanından kalıcı olarak silindi.`);
  } catch (error) {
    console.error('❌ Temizleme işlemi sırasında hata oluştu:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
