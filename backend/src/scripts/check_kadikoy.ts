import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        const kadikoyMasters = await prisma.user.findMany({
            where: {
                userType: 'ELECTRICIAN',
                deletedAt: null,
                OR: [
                    { city: { contains: 'Kadıköy', mode: 'insensitive' } },
                    { locations: { some: { district: { contains: 'Kadıköy', mode: 'insensitive' } } } }
                ]
            },
            select: {
                id: true,
                fullName: true,
                phone: true,
                city: true
            }
        });

        console.log(`Found ${kadikoyMasters.length} masters in Kadıköy:`);
        kadikoyMasters.forEach(m => {
            console.log(`- ${m.fullName} (${m.phone}) [ID: ${m.id}]`);
        });

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
