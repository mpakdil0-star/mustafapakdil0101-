const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function check() {
    try {
        console.log('Connecting to:', process.env.DATABASE_URL);
        
        // 1. Find any usta in Kadıköy
        const locations = await prisma.location.findMany({
            where: { district: 'Kadıköy' },
            include: {
                user: {
                    include: {
                        electricianProfile: true
                    }
                }
            }
        });

        console.log(`Found ${locations.length} Kadıköy location records:`);
        locations.forEach(l => {
            console.log(`- User: ${l.user.fullName} (${l.user.email})`);
            console.log(`  Row City: ${l.city}, Row District: ${l.district}`);
            console.log(`  User City Field: ${l.user.city}`);
            console.log(`  DeletedAt: ${l.user.deletedAt}`);
            console.log(`  Usta Profile Status: ${l.user.electricianProfile?.verificationStatus}`);
        });

        // 2. Check Adana Masters count vs Heatmap
        const adanaMasters = await prisma.user.count({
            where: {
                userType: 'ELECTRICIAN',
                deletedAt: null,
                OR: [
                    { city: { equals: 'Adana', mode: 'insensitive' } },
                    { locations: { some: { city: { equals: 'Adana', mode: 'insensitive' } } } }
                ]
            }
        });
        console.log(`\nAdana Masters Count (with deletedAt filter): ${adanaMasters}`);

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

check();
