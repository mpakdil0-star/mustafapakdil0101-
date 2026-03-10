const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const aliUsers = await prisma.user.findMany({
        where: { fullName: { contains: 'Ali' } },
        select: { id: true, fullName: true, pushToken: true }
    });
    console.log(JSON.stringify(aliUsers, null, 2));
    aliUsers.forEach(u => {
        console.log(`User: ${u.fullName}, pushToken type: ${typeof u.pushToken}, value: "${u.pushToken}", boolean test: ${!!u.pushToken}`);
    });
}

check()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
