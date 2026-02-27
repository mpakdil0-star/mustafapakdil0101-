const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const electricians = await prisma.user.findMany({
        where: { userType: 'ELECTRICIAN' },
        include: { locations: true, electricianProfile: true },
        take: 5,
        orderBy: { createdAt: 'desc' }
    });

    console.log(JSON.stringify(electricians, null, 2));
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
