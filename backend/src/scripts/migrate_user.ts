import { PrismaClient } from '@prisma/client';
import { mockStorage } from '../utils/mockStorage';

const prisma = new PrismaClient();

async function migrateUser() {
    const email = 'tugceyildirim782@gmail.com';
    const allUsers = mockStorage.getAllUsers();
    const user = allUsers.find((u: any) => u.email === email);
    
    if (!user) {
        console.log('User not found in mock storage');
        return;
    }
    
    const exists = await prisma.user.findFirst({ where: { email } });
    if (exists) {
        console.log('User already in DB:', exists.id);
        return;
    }
    
    console.log('Migrating user...', user);
    
    await prisma.user.create({
        data: {
            email: user.email,
            fullName: user.fullName,
            phone: user.phone || '',
            isVerified: user.isVerified || true,
            userType: user.userType || 'CITIZEN',
            profileImageUrl: user.profileImageUrl,
            passwordHash: user.passwordHash || 'MIGRATED',
            acceptedLegalVersion: user.acceptedLegalVersion || '25 Mart 2026 Tarihli Sözleşme',
            marketingAllowed: user.marketingAllowed || false,
        }
    });

    console.log('Migration successful');
}

migrateUser().catch(console.error).finally(() => prisma.$disconnect());
