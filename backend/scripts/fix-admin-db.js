
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const email = 'mpakdil0@gmail.com';
  console.log(`Checking user: ${email}`);
  
  try {
    const user = await prisma.user.findUnique({
      where: { email }
    });
    
    if (user) {
      console.log('User found in DB:');
      console.log(`  ID: ${user.id}`);
      console.log(`  UserType: ${user.userType}`);
      console.log(`  IsActive: ${user.isActive}`);
      
      if (user.userType !== 'ADMIN') {
        console.log('Updating user to ADMIN...');
        await prisma.user.update({
          where: { email },
          data: { userType: 'ADMIN' }
        });
        console.log('Update successful.');
      } else {
        console.log('User is already ADMIN.');
      }
    } else {
      console.log('User not found in DB.');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

run();
