async function fetchLiveJobs() {
  try {
    console.log('--- Fetching Live Jobs from Render ---');
    const response = await fetch('https://elektrikciler-backend.onrender.com/api/v1/jobs?limit=10');
    const data = await response.json();
    console.log('Response Status:', response.status);
    console.log('Jobs Count:', data.jobs ? data.jobs.length : '0');
    console.log('Jobs:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error fetching live jobs:', error);
  }
}

fetchLiveJobs();
