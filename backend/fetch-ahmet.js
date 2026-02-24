fetch('https://elektrikciler-backend.onrender.com/api/v1/users/electricians')
    .then(res => res.json())
    .then(data => {
        const ahmet = data.data.find(u =>
            (u.email && u.email.toLowerCase().includes('ahmet')) ||
            (u.fullName && u.fullName.toLowerCase().includes('ahmet'))
        );
        console.log('--- AHMET FROM RENDER API ---');
        console.log(JSON.stringify(ahmet || { error: 'Not found' }, null, 2));
    })
    .catch(console.error);
