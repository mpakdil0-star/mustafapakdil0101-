import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Usta Puan Güncelleme Scripti Başladı ---');

  const updates = [
    { name: 'Ufuk soydan', rating: 4.9, reviews: 12 },
    { name: 'Hasan Yıldırım', rating: 4.8, reviews: 10 },
    { name: 'Said Ugan', rating: 4.8, reviews: 8 },
    { name: 'Mehmet Cebiş', rating: 4.8, reviews: 9 },
  ];

  for (const item of updates) {
    try {
      const user = await prisma.user.findFirst({
        where: {
          fullName: {
            equals: item.name,
            mode: 'insensitive',
          },
        },
      });

      if (user) {
        await prisma.electricianProfile.update({
          where: { userId: user.id },
          data: {
            ratingAverage: item.rating,
            totalReviews: item.reviews,
          },
        });
        console.log(`✅ ${item.name} güncellendi: ${item.rating} puan, ${item.reviews} yorum.`);
      } else {
        console.log(`❌ Kullanıcı bulunamadı: ${item.name}`);
      }
    } catch (error) {
      console.error(`⚠️ Hata oluştu (${item.name}):`, error);
    }
  }

  console.log('--- İşlem Tamamlandı ---');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
