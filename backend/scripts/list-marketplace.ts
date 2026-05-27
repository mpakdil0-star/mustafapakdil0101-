import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Aktif ilanlar sorgulanıyor...');
  try {
    const products = await prisma.marketplaceProduct.findMany({});
    console.log(`📋 Toplam ${products.length} ilan bulundu.`);
    products.forEach((p, index) => {
      console.log(`[${index + 1}] ID: ${p.id}`);
      console.log(`    Başlık (Title): "${p.title}"`);
      console.log(`    Açıklama (Desc): "${p.desc}"`);
      console.log(`    Satıcı (Seller): "${p.sellerName}"`);
      console.log(`    Kategori (Category): "${p.category}"`);
      console.log(`    Fiyat (Price): "${p.price}"`);
    });
  } catch (error) {
    console.error('❌ Sorgulama sırasında hata oluştu:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
