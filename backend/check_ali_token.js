const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUsers() {
    try {
        const users = await prisma.user.findMany({
            select: { fullName: true, id: true, email: true, pushToken: true }
        });

        const aliUsers = users.filter(u => u.fullName && u.fullName.toLowerCase().includes('ali'));
        console.log(JSON.stringify(aliUsers, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

checkUsers();
