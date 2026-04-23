import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const email = 'tugceyildirim782@gmail.com';
    const user = await prisma.user.findFirst({ where: { email } });
    
    if (user) {
        console.log(`Found user: ${user.email}, Current status: isActive=${user.isActive}`);
        if (!user.isActive) {
            await prisma.user.update({
                where: { id: user.id },
                data: { isActive: true, deletedAt: null }
            });
            console.log('✅ User activated successfully!');
        } else {
            console.log('ℹ️ User is already active.');
        }
    } else {
        console.log('❌ User not found in database.');
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
