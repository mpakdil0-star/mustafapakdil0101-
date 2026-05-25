const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function queryJobs() {
  try {
    console.log('--- Querying Job Posts ---');
    const jobs = await prisma.jobPost.findMany({
      include: {
        citizen: true
      }
    });
    console.log('Total Job Posts in DB:', jobs.length);
    jobs.forEach((job, index) => {
      console.log(`\nJob #${index + 1}:`);
      console.log(`- Title: "${job.title}"`);
      console.log(`- Estimated Budget: "${job.estimatedBudget}"`);
      console.log(`- Location:`, JSON.stringify(job.location));
      console.log(`- Urgency Level: "${job.urgencyLevel}"`);
      console.log(`- Citizen: "${job.citizen?.fullName}" (${job.citizen?.email})`);
    });
  } catch (error) {
    console.error('Error querying jobs:', error);
  } finally {
    await prisma.$disconnect();
  }
}

queryJobs();
