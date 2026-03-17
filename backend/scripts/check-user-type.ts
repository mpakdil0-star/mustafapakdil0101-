
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkUser() {
    try {
        const user = await prisma.user.findFirst({
            where: { email: 'mpakdil0@gmail.com' }
        });
        if (user) {
            console.log(`RESULT_FOUND`);
            console.log(`Email: ${user.email}`);
            console.log(`UserType: ${user.userType}`);
            console.log(`IsActive: ${user.isActive}`);
        } else {
            console.log(`RESULT_NOT_FOUND`);
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkUser();
