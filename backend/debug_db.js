const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debug() {
    try {
        console.log('--- Database Debug ---');
        const userCount = await prisma.user.count();
        console.log('Total users:', userCount);

        const electricians = await prisma.user.findMany({
            where: { userType: 'ELECTRICIAN' },
            include: {
                electricianProfile: true,
                locations: true
            }
        });

        console.log('Total electricians:', electricians.length);
        electricians.forEach(e => {
            console.log(`- ${e.fullName} (${e.email}): Verified=${e.isVerified}, Locations=${e.locations.length}`);
            e.locations.forEach(l => {
                console.log(`  * Location: ${l.city}/${l.district}, Default=${l.isDefault}, Lat=${l.latitude}, Lng=${l.longitude}`);
            });
        });

    } catch (error) {
        console.error('Debug Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

debug();
