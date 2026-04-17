
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const email = 'mpakdil0@gmail.com';
    
    try {
        const user = await prisma.user.update({
            where: { email },
            data: { 
                userType: 'ADMIN' as any // Enum'da ADMIN yoksa bile zorla (bazen enumlar kısıtlı olabiliyor)
            }
        });
        console.log('✅ Kullanıcı tipi ADMIN olarak güncellendi:', user.email);
    } catch (error) {
        console.error('❌ Güncelleme hatası:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
