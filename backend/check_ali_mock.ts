import { getAllMockUsers } from './src/utils/mockStorage';

const users = getAllMockUsers();
const ali = Object.values(users).find(u => u.fullName === 'Ali');
if (ali) {
    console.log(`Ali's push token: ${ali.pushToken}`);
    console.log(`Ali's hasPushNotification mapping: ${!!ali.pushToken}`);
} else {
    console.log('Ali not found in mock storage');
}
