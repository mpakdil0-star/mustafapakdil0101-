
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({
    where: {
      email: { contains: 'ak@gmail.com', mode: 'insensitive' }
    },
    include: {
      electricianProfile: true
    }
  });

  if (!user) {
    console.log('User ak@gmail.com not found in database.');
    return;
  }

  console.log('--- User Info ---');
  console.log(`ID: ${user.id}`);
  console.log(`Email: ${user.email}`);
  console.log(`FullName: ${user.fullName}`);
  console.log(`VerificationStatus: ${user.electricianProfile?.verificationStatus}`);
  console.log(`VerificationDocuments:`, JSON.stringify(user.electricianProfile?.verificationDocuments, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
