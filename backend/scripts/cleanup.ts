import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const adminEmail = 'mpakdil0@gmail.com';

async function main() {
  console.log('🧹 Temizlik (Cleanup) işlemi başlatılıyor...');
  console.log(`⚠️ Sadece ${adminEmail} hesabı ve ilişkili yasal metinleri tutulacak, geri kalan her şey SİLİNECEK!`);

  // Admin hesabını bul
  const adminDoc = await prisma.user.findUnique({
    where: { email: adminEmail }
  });

  if (!adminDoc) {
    console.error(`❌ HATA: '${adminEmail}' e-postasına sahip bir Admin hesabı bulunamadı!`);
    console.log('Lütfen önce uygulamanıza bu e-posta adresiyle bir hesap oluşturun.');
    process.exit(1);
  }

  const adminId = adminDoc.id;

  try {
    // 1. Önce bağımlı alt kayıtları silelim (Review, Message vb.) 
    // DİKKAT: Admin dahil TÜM İLAN VE TEKLİFLERİ siliyoruz ki tamamen sıfır bir sistem başlasın.
    console.log('🗑️  Teklifler, Mesajlar, Değerlendirmeler ve Raporlar siliniyor...');
    await prisma.bid.deleteMany({});
    await prisma.supportTicketMessage.deleteMany({});
    await prisma.supportTicket.deleteMany({});
    await prisma.message.deleteMany({});
    await prisma.conversation.deleteMany({});
    await prisma.review.deleteMany({});
    await prisma.escrowAccount.deleteMany({});
    await prisma.payment.deleteMany({});
    await prisma.report.deleteMany({});
    await prisma.favorite.deleteMany({});
    await prisma.block.deleteMany({});
    await prisma.notification.deleteMany({});
    await prisma.location.deleteMany({ where: { userId: { not: adminId } } }); 

    // 2. İlanları silelim
    console.log('🗑️  Tüm ilanlar siliniyor...');
    await prisma.jobPost.deleteMany({});

    // 3. Admin harici Usta (Electrician) profillerini silelim
    console.log('🗑️  Usta profilleri siliniyor...');
    await prisma.electricianProfile.deleteMany({
      where: { userId: { not: adminId } }
    });

    // 4. Admin harici hesap cüzdan / yasal izinleri silelim
    console.log('🗑️  Hesap bakiyeleri ve Onay formları temizleniyor...');
    await prisma.credit.deleteMany({ where: { userId: { not: adminId } } });
    await prisma.userConsent.deleteMany({ where: { userId: { not: adminId } } });

    // 5. Son olarak Admin hariç TÜM kullanıcıları siliyoruz (Mock Data Dahil)
    console.log('🗑️  Kullanıcılar siliniyor...');
    const result = await prisma.user.deleteMany({
      where: {
        id: { not: adminId }
      }
    });

    console.log(`✅ TEMİZLİK TAMAMLANDI! `);
    console.log(`✅  Toplam ${result.count} test/sahte kullanıcı hesabı veritabanından kalıcı olarak silindi.`);
    console.log(`✅  ${adminEmail} (Admin) hesabı başarılı bir şekilde korundu.`);
  } catch (error) {
    console.error('❌ İşlem sırasında bir veritabanı hatası oluştu:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
