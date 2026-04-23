import prisma from './src/config/database';

async function checkUser() {
    const email = 'tugceyildirim782@gmail.com';
    const users = await prisma.user.findMany({ where: { email } });
    console.log("Found users length:", users.length);
    for (const u of users) {
        console.log(`ID: ${u.id}, isActive: ${u.isActive}, isBanned: ${u.isBanned}, isVerified: ${u.isVerified}, deletedAt: ${u.deletedAt}`);
    }
}
checkUser().finally(() => prisma.$disconnect());
