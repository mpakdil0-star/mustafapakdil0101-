fetch('https://elektrikciler-backend.onrender.com/api/v1/users/electricians')
    .then(res => res.json())
    .then(data => {
        const ahmet = data.data.find(u => u.email === 'ahmet@gmail.com' || (u.fullName && u.fullName.toLowerCase().includes('ahmet')));
        console.log('Ahmet Email:', ahmet?.email);
        console.log('Ahmet Phone:', ahmet?.phone);
        console.log('Ahmet ID:', ahmet?.id);
    })
    .catch(console.error);
