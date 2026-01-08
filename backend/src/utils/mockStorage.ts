/**
 * Mock Storage - Veritabanı bağlantısı olmadığında bakiye gibi 
 * verilerin session boyunca "kalıcı" kalmasını sağlar.
 */

interface MockUserStore {
    [userId: string]: {
        id: string;
        fullName?: string;
        phone?: string;
        email?: string;
        profileImageUrl?: string;
        userType?: string;
        passwordHash?: string;
        creditBalance: number;
        experienceYears: number;
        specialties: string[];
        isVerified?: boolean;
        isActive?: boolean;
        verificationStatus?: string;
        documentType?: string;
        submittedAt?: string;
        documentUrl?: string;
        city?: string;
        district?: string;
        bio?: string;
        completedJobsCount?: number;
        locations?: any[];
        serviceCategory?: string; // Ana hizmet kategorisi: 'elektrik' | 'cilingir' | 'klima' | 'beyaz-esya' | 'tesisat'
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


const saveToDisk = () => {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(mockStore, null, 2), 'utf8');
    } catch (error) {
        console.error('❌ Failed to save mock data:', error);
    }
};

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
                isVerified: true,
                isActive: true
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
                isVerified: true,
                isActive: true
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

// Initialize demo accounts on startup - DISABLED per user request
// initDemoAccounts();

export const mockStorage = {
    get: (userId: string) => {
        if (!mockStore[userId]) {
            // Default initial values
            mockStore[userId] = {
                id: userId,
                passwordHash: undefined,
                creditBalance: 5,
                experienceYears: 0,
                specialties: [],
                fullName: 'Test Kullanıcısı',
                phone: '05551234567',
                email: userId.includes('@') ? (userId.includes('mock-user-') ? userId.split('-').filter(p => p.includes('.')).join('.') || userId : userId) : 'mock@example.com',
                isVerified: false,
                isActive: true, // Default active
                city: 'İstanbul',
                district: 'Merkez',
                verificationStatus: undefined,
                locations: [],
                completedJobsCount: 0,
                profileImageUrl: undefined
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
        isActive?: boolean,
        profileImageUrl?: string,
        verificationStatus?: string | null,
        documentType?: string,
        submittedAt?: string,
        documentUrl?: string | null,
        passwordHash?: string,
        city?: string,
        district?: string,
        locations?: any[],
        completedJobsCount?: number,
        serviceCategory?: string
    }) => {
        const store = mockStorage.get(userId);
        if (data.passwordHash !== undefined) store.passwordHash = data.passwordHash;
        if (data.experienceYears !== undefined) store.experienceYears = data.experienceYears;
        if (data.specialties !== undefined) store.specialties = data.specialties;
        if (data.fullName !== undefined) store.fullName = data.fullName;
        if (data.phone !== undefined) store.phone = data.phone;
        if (data.email !== undefined) store.email = data.email;
        if (data.isVerified !== undefined) store.isVerified = data.isVerified;
        if (data.isActive !== undefined) store.isActive = data.isActive;
        if (data.profileImageUrl !== undefined) store.profileImageUrl = data.profileImageUrl;
        if (data.verificationStatus !== undefined) store.verificationStatus = data.verificationStatus || undefined;
        if (data.documentType !== undefined) store.documentType = data.documentType;
        if (data.submittedAt !== undefined) store.submittedAt = data.submittedAt;
        if (data.documentUrl !== undefined) store.documentUrl = data.documentUrl || undefined;
        if (data.city !== undefined) store.city = data.city;
        if (data.district !== undefined) store.district = data.district;
        if (data.locations !== undefined) store.locations = data.locations;
        if (data.completedJobsCount !== undefined) store.completedJobsCount = data.completedJobsCount;
        if (data.serviceCategory !== undefined) store.serviceCategory = data.serviceCategory;
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
            isActive: store.isActive !== undefined ? store.isActive : true,
            verificationStatus: store.verificationStatus || null,
            documentType: store.documentType || null,
            submittedAt: store.submittedAt || null,
            electricianProfile: userType === 'ELECTRICIAN' ? {
                completedJobsCount: store.completedJobsCount || 0,
                experienceYears: store.experienceYears,
                specialties: store.specialties,
                creditBalance: store.creditBalance,
                isAvailable: true,
                verificationStatus: store.verificationStatus || null,
                verificationDocuments: {
                    documentType: store.documentType || null,
                    documentUrl: store.documentUrl ?? undefined,
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

// ============== MOCK REVIEWS STORAGE ==============

interface MockReview {
    id: string;
    electricianId: string;
    reviewerId: string;
    reviewerName: string;
    reviewerImageUrl?: string | null;
    rating: number;
    comment: string;
    createdAt: string;
    jobId?: string;
}

const REVIEWS_FILE = path.join(DATA_DIR, 'mock_reviews.json');

// Load reviews from file
let mockReviews: MockReview[] = [];
if (fs.existsSync(REVIEWS_FILE)) {
    try {
        const reviewData = fs.readFileSync(REVIEWS_FILE, 'utf8');
        mockReviews = JSON.parse(reviewData);
        console.log(`⭐ Mock reviews loaded: ${mockReviews.length} reviews`);
    } catch (error) {
        console.error('❌ Failed to load mock reviews:', error);
        mockReviews = [];
    }
}

const saveReviewsToDisk = () => {
    try {
        fs.writeFileSync(REVIEWS_FILE, JSON.stringify(mockReviews, null, 2), 'utf8');
    } catch (error) {
        console.error('❌ Failed to save mock reviews:', error);
    }
};

export const mockReviewStorage = {
    // Add a new review
    addReview: (review: Omit<MockReview, 'id' | 'createdAt'>) => {
        const newReview: MockReview = {
            ...review,
            id: `review-${Date.now()}`,
            createdAt: new Date().toISOString()
        };
        mockReviews.push(newReview);
        saveReviewsToDisk();

        // Update electrician's rating stats
        mockReviewStorage.updateElectricianRating(review.electricianId);

        return newReview;
    },

    // Get reviews for an electrician
    getReviewsForElectrician: (electricianId: string) => {
        return mockReviews
            .filter(r => r.electricianId === electricianId)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    },

    // Calculate and update electrician's rating
    updateElectricianRating: (electricianId: string) => {
        const reviews = mockReviews.filter(r => r.electricianId === electricianId);
        if (reviews.length === 0) return { ratingAverage: 0, totalReviews: 0 };

        const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
        const ratingAverage = parseFloat((totalRating / reviews.length).toFixed(1));

        // Update user's rating in mockStore if exists
        if (mockStore[electricianId]) {
            (mockStore[electricianId] as any).ratingAverage = ratingAverage;
            (mockStore[electricianId] as any).totalReviews = reviews.length;
            saveToDisk();
        }

        return { ratingAverage, totalReviews: reviews.length };
    },

    // Get rating stats for an electrician
    getRatingStats: (electricianId: string) => {
        const reviews = mockReviews.filter(r => r.electricianId === electricianId);
        if (reviews.length === 0) return { ratingAverage: 0, totalReviews: 0 };

        const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
        return {
            ratingAverage: parseFloat((totalRating / reviews.length).toFixed(1)),
            totalReviews: reviews.length
        };
    },

    // Check if user has already reviewed this electrician for a specific job
    hasReviewed: (reviewerId: string, electricianId: string, jobId?: string) => {
        return mockReviews.some(r =>
            r.reviewerId === reviewerId &&
            r.electricianId === electricianId &&
            (!jobId || r.jobId === jobId)
        );
    },

    // Get all reviews
    getAllReviews: () => mockReviews
};

// Export helper to get all mock users (for notifications, etc.)
export const getAllMockUsers = () => mockStore;

export default mockStorage;
