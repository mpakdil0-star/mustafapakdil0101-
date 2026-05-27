import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 "Jdj" test ilanı siliniyor...');
  
  try {
    const result = await prisma.marketplaceProduct.deleteMany({
      where: {
        OR: [
          { title: 'Jdj' },
          { desc: 'Mdkdkdmfm' }
        ]
      }
    });
    
    console.log(`✅ İşlem tamamlandı. Toplam ${result.count} adet test ilanı veritabanından kalıcı olarak silindi.`);
  } catch (error) {
    console.error('❌ Temizleme işlemi sırasında hata oluştu:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
