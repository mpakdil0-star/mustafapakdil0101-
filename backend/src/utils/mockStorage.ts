/**
 * Mock Storage - Veritabanı bağlantısı olmadığında bakiye gibi 
 * verilerin session boyunca "kalıcı" kalmasını sağlar.
 */

interface MockUserStore {
    [userId: string]: {
        passwordHash?: string;
        creditBalance: number;
        experienceYears: number;
        specialties: string[];
        fullName?: string;
        phone?: string;
        email?: string;
        isVerified?: boolean;
        profileImageUrl?: string;
        verificationStatus?: string | null;
        documentType?: string;
        submittedAt?: string;
        documentUrl?: string | null;
    }
}

import fs from 'fs';
import path from 'path';

// Singleton storage
const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'mock_users.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Load data from file if exists
let mockStore: MockUserStore = {};
if (fs.existsSync(DATA_FILE)) {
    try {
        const fileData = fs.readFileSync(DATA_FILE, 'utf8');
        mockStore = JSON.parse(fileData);
        console.log(`📦 Mock data loaded from ${DATA_FILE}`);
    } catch (error) {
        console.error('❌ Failed to load mock data:', error);
        mockStore = {};
    }
}

// Initialize demo accounts for testing (can be removed after testing)
const initDemoAccounts = () => {
    const demoAccounts = [
        {
            userId: 'mock-user-demo-vatandas-com-CITIZEN',
            data: {
                passwordHash: '123456',
                creditBalance: 0,
                experienceYears: 0,
                specialties: [],
                fullName: 'Demo Vatandaş',
                phone: '05551234567',
                email: 'demo@vatandas.com',
                isVerified: true
            }
        },
        {
            userId: 'mock-user-demo-usta-com-ELECTRICIAN',
            data: {
                passwordHash: '123456',
                creditBalance: 50, // Başlangıç kredisi
                experienceYears: 5,
                specialties: ['Ev Elektrik', 'Pano Bakım'],
                fullName: 'Demo Elektrikçi',
                phone: '05559876543',
                email: 'demo@usta.com',
                isVerified: true
            }
        }
    ];

    demoAccounts.forEach(account => {
        if (!mockStore[account.userId]) {
            mockStore[account.userId] = account.data as any;
            console.log(`✅ Demo account created: ${account.data.email}`);
        }
    });
    saveToDisk();
};

// Initialize demo accounts on startup
initDemoAccounts();

const saveToDisk = () => {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(mockStore, null, 2), 'utf8');
    } catch (error) {
        console.error('❌ Failed to save mock data:', error);
    }
};

export const mockStorage = {
    get: (userId: string) => {
        if (!mockStore[userId]) {
            // Default initial values
            mockStore[userId] = {
                passwordHash: undefined,
                creditBalance: 0,
                experienceYears: 0,
                specialties: [],
                fullName: undefined,
                phone: '',
                email: userId.includes('@') ? (userId.includes('mock-user-') ? userId.split('-').filter(p => p.includes('.')).join('.') || userId : userId) : 'mock@example.com',
                isVerified: false,
                verificationStatus: null
            };
            saveToDisk();
        }
        return mockStore[userId];
    },

    updateProfile: (userId: string, data: {
        experienceYears?: number,
        specialties?: string[],
        fullName?: string,
        phone?: string,
        email?: string,
        isVerified?: boolean,
        profileImageUrl?: string,
        verificationStatus?: string | null,
        documentType?: string,
        submittedAt?: string,
        documentUrl?: string | null,
        passwordHash?: string
    }) => {
        const store = mockStorage.get(userId);
        if (data.passwordHash !== undefined) store.passwordHash = data.passwordHash;
        if (data.experienceYears !== undefined) store.experienceYears = data.experienceYears;
        if (data.specialties !== undefined) store.specialties = data.specialties;
        if (data.fullName !== undefined) store.fullName = data.fullName;
        if (data.phone !== undefined) store.phone = data.phone;
        if (data.email !== undefined) store.email = data.email;
        if (data.isVerified !== undefined) store.isVerified = data.isVerified;
        if (data.profileImageUrl !== undefined) store.profileImageUrl = data.profileImageUrl;
        if (data.verificationStatus !== undefined) store.verificationStatus = data.verificationStatus;
        if (data.documentType !== undefined) store.documentType = data.documentType;
        if (data.submittedAt !== undefined) store.submittedAt = data.submittedAt;
        if (data.documentUrl !== undefined) store.documentUrl = data.documentUrl;
        saveToDisk();
        return store;
    },

    updateBalance: (userId: string, newBalance: number) => {
        const store = mockStorage.get(userId);
        store.creditBalance = newBalance;
        saveToDisk();
        return store;
    },

    addCredits: (userId: string, amount: number) => {
        const data = mockStorage.get(userId);
        data.creditBalance += amount;
        saveToDisk();
        return data;
    },

    getFullUser: (userId: string, userType: string = 'CITIZEN') => {
        const store = mockStorage.get(userId);
        return {
            id: userId,
            fullName: (store.fullName && store.fullName.trim() !== '') ? store.fullName : 'Test Kullanıcısı',
            email: store.email || 'mock@example.com',
            passwordHash: store.passwordHash,
            phone: store.phone || '',
            userType: userType,
            profileImageUrl: store.profileImageUrl || null,
            isVerified: store.isVerified || false,
            verificationStatus: store.verificationStatus || null,
            documentType: store.documentType || null,
            submittedAt: store.submittedAt || null,
            electricianProfile: userType === 'ELECTRICIAN' ? {
                experienceYears: store.experienceYears,
                specialties: store.specialties,
                creditBalance: store.creditBalance,
                isAvailable: true,
                verificationStatus: store.verificationStatus || null,
                verificationDocuments: {
                    documentType: store.documentType || null,
                    documentUrl: store.documentUrl || null,
                    submittedAt: store.submittedAt || null,
                }
            } : null
        };
    },

    getAllUsers: () => {
        return Object.keys(mockStore).map(id => {
            // Determine userType from ID suffix if possible, else default
            const userType = id.endsWith('-ADMIN') ? 'ADMIN' : (id.endsWith('-ELECTRICIAN') ? 'ELECTRICIAN' : 'CITIZEN');
            return mockStorage.getFullUser(id, userType);
        });
    }
};
