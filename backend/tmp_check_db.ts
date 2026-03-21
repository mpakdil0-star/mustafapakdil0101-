import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkVerifications() {
    try {
        const verifications = await prisma.electricianProfile.findMany({
            where: {
                verificationStatus: 'PENDING'
            },
            include: { user: true }
        });
        
        console.log('--- Pending Verifications Detail ---');
        verifications.forEach(v => {
            console.log(`User: ${v.user.email} (${v.user.fullName})`);
            console.log(`- License: ${v.licenseNumber}`);
            console.log(`- EMO: ${v.emoNumber}`);
            console.log(`- SMM: ${v.smmNumber}`);
            console.log(`- DocType: ${v.verificationDocuments && (v.verificationDocuments as any).documentType}`);
            console.log('-----------------------------------');
        });
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

checkVerifications();
