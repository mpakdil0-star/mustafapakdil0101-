import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const user = await prisma.user.findFirst({
        where: { email: 'ahmet@gmail.com' },
        include: { electricianProfile: true }
    });
    console.log('--- AHMET USER DATA ---');
    console.log(JSON.stringify(user, null, 2));
    console.log('-----------------------');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
