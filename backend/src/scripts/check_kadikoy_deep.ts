import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        const users = await prisma.user.findMany({
            where: {
                OR: [
                    { city: { contains: 'Kadıköy', mode: 'insensitive' } },
                    { locations: { some: { district: { contains: 'Kadıköy', mode: 'insensitive' } } } }
                ]
            },
            include: {
                locations: true,
                electricianProfile: true
            }
        });

        console.log(`Found ${users.length} users in Kadıköy:`);
        users.forEach(u => {
            console.log(`- ${u.fullName} (${u.email}) [ID: ${u.id}]`);
            console.log(`  Type: ${u.userType}, DeletedAt: ${u.deletedAt}`);
            console.log(`  Locations: ${JSON.stringify(u.locations)}`);
        });

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
