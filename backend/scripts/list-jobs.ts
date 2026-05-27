import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Canlı veritabanındaki aktif iş ilanları (JobPost) sorgulanıyor...');
  try {
    const jobPosts = await prisma.jobPost.findMany({
      where: {
        deletedAt: null
      },
      include: {
        citizen: {
          select: {
            fullName: true,
            email: true
          }
        }
      }
    });

    console.log(`📋 Toplam ${jobPosts.length} aktif iş ilanı bulundu.`);
    jobPosts.forEach((job, index) => {
      console.log(`[${index + 1}] ID: ${job.id}`);
      console.log(`    Başlık (Title): "${job.title}"`);
      console.log(`    Durum (Status): "${job.status}"`);
      console.log(`    Yayınlayan (Citizen): "${job.citizen?.fullName || 'Bilinmiyor'} (${job.citizen?.email || 'E-posta yok'})"`);
      console.log(`    Oluşturulma Tarihi (Created At): ${job.createdAt}`);
    });

    // Toplam Üye sayısı kontrolü
    const totalUsers = await prisma.user.count({
      where: { deletedAt: null, isActive: true }
    });
    console.log(`👥 Toplam Aktif Üye Sayısı: ${totalUsers}`);
  } catch (error) {
    console.error('❌ Sorgulama sırasında veritabanı hatası oluştu:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
