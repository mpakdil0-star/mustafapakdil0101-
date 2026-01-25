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
        serviceCategory?: string;
        pushToken?: string;
        acceptedLegalVersion?: string; // Last accepted version (e.g. 'v1.0')
        marketingAllowed?: boolean;    // Marketing opt-in status
    }
}

import * as fs from 'fs';
import * as path from 'path';

// Singleton storage
const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'mock_users.json');
const LEGAL_FILE = path.join(DATA_DIR, 'mock_legal.json');
const CONSENT_FILE = path.join(DATA_DIR, 'mock_consents.json');

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

        // Migration: Add userType to existing users if missing
        let migrationNeeded = false;
        for (const id of Object.keys(mockStore)) {
            if (!mockStore[id].userType) {
                if (id.endsWith('-ELECTRICIAN')) {
                    mockStore[id].userType = 'ELECTRICIAN';
                } else if (id.endsWith('-ADMIN')) {
                    mockStore[id].userType = 'ADMIN';
                } else {
                    mockStore[id].userType = 'CITIZEN';
                }
                migrationNeeded = true;
            }
        }
        if (migrationNeeded) {
            fs.writeFileSync(DATA_FILE, JSON.stringify(mockStore, null, 2), 'utf8');
            console.log('🔄 Migration: Added userType to existing users');
        }
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

// --- LEGAL & CONSENT PERSISTENCE ---

interface LegalDocument {
    id: string;
    type: 'KVKK' | 'TERMS' | 'PRIVACY' | 'MARKETING';
    version: string;
    title: string;
    content: string;
    isActive: boolean;
    updatedAt: string;
}

interface UserConsent {
    id: string;
    userId: string;
    documentType: string;
    documentVersion: string;
    ipAddress?: string;
    userAgent?: string;
    action: 'ACCEPTED' | 'REJECTED';
    createdAt: string;
}

let legalDocuments: LegalDocument[] = [];
if (fs.existsSync(LEGAL_FILE)) {
    console.log('📜 Loading legal docs from disk...');
    try {
        legalDocuments = JSON.parse(fs.readFileSync(LEGAL_FILE, 'utf8'));
    } catch (e) {
        legalDocuments = [];
    }
} else {
    legalDocuments = [
        {
            id: 'doc-kvkk-v1',
            type: 'KVKK',
            version: 'v1.0',
            title: 'KVKK Aydınlatma Metni',
            content: 'Veri Sorumlusu: [ADINIZ SOYADINIZ]\\n\\n1. İŞLEME AMACI VE HUKUKİ SEBEP: Kişisel verileriniz, 6698 sayılı KVKK Madde 5/2-c uyarınca "bir sözleşmenin kurulması veya ifasıyla doğrudan doğruya ilgili olması" hukuki sebebine dayanarak; hizmet eşleştirme, hesap yönetimi ve platform güvenliği amaçlarıyla işlenmektedir.\\n2. İŞLENEN VERİLER: Kimlik (Ad-Soyad), İletişim (E-posta, Tel), Cihaz/İşlem Güvenliği (IP, Cihaz ID) ve Konum (İş ilanı/Usta bulma için).\\n3. VERİ AKTARIMI: Verileriniz, hizmetin sunulması için gerekli teknik altyapı sağlayıcıları (Expo, Firebase) ve bağımsız denetim/yasal zorunluluklar dışında 3. taraflara aktarılmaz.\\n4. SAKLAMA SÜRESİ: Kişisel verileriniz, yasal zamanaşımı süreleri ve platform kullanım süreniz boyunca saklanır.\\n5. HAKLARINIZ: KVKK Madde 11 uyarınca [E-POSTA ADRESİNİZ] üzerinden verilerinize erişme, düzeltme veya silme talebinde bulunabilirsiniz.',
            isActive: true,
            updatedAt: new Date().toISOString()
        },
        {
            id: 'doc-terms-v1',
            type: 'TERMS',
            version: 'v1.0',
            title: 'Kullanıcı Sözleşmesi',
            content: '1. TARAFLAR: İşbitir platformu, Geliştirici [ADINIZ SOYADINIZ] ile kullanıcı arasındadır.\\n2. YAŞ SINIRI: Platformu kullanabilmek için 18 yaşını doldurmuş olmanız gerekmektedir.\\n3. FİKRİ MÜLKİYET: Uygulamanın tasarımı, yazılım kodları, logosu ve tüm içeriği Geliştiriciye aittir; izinsiz kopyalanamaz.\\n4. SORUMLULUK REDDİ: Platform, kullanıcılar arasındaki iletişimi sağlayan bir köprüdür. Geliştirici; sunulan hizmetin kalitesi, gecikmesi veya taraflar arasındaki uyuşmazlıklardan maddi/manevi sorumlu tutulamaz.\\n5. HESAP FESHİ: Kullanım kurallarını ihlal eden veya platform güvenliğini tehdit eden hesaplar, Geliştirici tarafından önceden bildirim yapmaksızın kapatılabilir.\\n6. UYUŞMAZLIKLAR: İşbu sözleşmeden doğan uyuşmazlıklarda İstanbul (Çağlayan) Mahkemeleri ve İcra Daireleri yetkilidir.',
            isActive: true,
            updatedAt: new Date().toISOString()
        },
        {
            id: 'doc-privacy-v1',
            type: 'PRIVACY',
            version: 'v1.0',
            title: 'Gizlilik Politikası',
            content: 'Gizliliğiniz bizim için önceliğimizdir. Toplanan verilerinizin korunması için endüstri standardı şifreleme yöntemleri kullanılmaktadır. Konum verileriniz sadece uygulama açıkken ve sizin izninizle, size en yakın hizmet noktalarını göstermek için işlenir. Çerezler ve yerel depolama verileri sadece oturum yönetimi için kullanılır; reklam amaçlı profil oluşturma yapılmaz.',
            isActive: true,
            updatedAt: new Date().toISOString()
        },
        {
            id: 'doc-marketing-v1',
            type: 'MARKETING',
            version: 'v1.0',
            title: 'Pazarlama İletişim Onayı',
            content: 'Bu onayı vererek, İşbitir tarafından sunulan yeni özellikler, özel teklifler, indirimli kredi paketleri ve güncellemeler hakkında tarafınıza e-posta veya anlık bildirim yoluyla ticari elektronik ileti gönderilmesini kabul etmiş olursunuz. Onayınızı Profil/Ayarlar menüsünden dilediğiniz zaman kaldırabilirsiniz.',
            isActive: true,
            updatedAt: new Date().toISOString()
        }
    ];
    fs.writeFileSync(LEGAL_FILE, JSON.stringify(legalDocuments, null, 2), 'utf8');
}

let userConsents: UserConsent[] = [];
if (fs.existsSync(CONSENT_FILE)) {
    try {
        userConsents = JSON.parse(fs.readFileSync(CONSENT_FILE, 'utf8'));
    } catch (e) {
        userConsents = [];
    }
}

const saveLegalToDisk = () => fs.writeFileSync(LEGAL_FILE, JSON.stringify(legalDocuments, null, 2), 'utf8');
const saveConsentsToDisk = () => fs.writeFileSync(CONSENT_FILE, JSON.stringify(userConsents, null, 2), 'utf8');

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
        },
        {
            userId: 'mock-user-demo-admin-com-ADMIN',
            data: {
                passwordHash: '123456',
                creditBalance: 9999,
                experienceYears: 10,
                specialties: [],
                fullName: 'Sistem Yöneticisi',
                phone: '05550000000',
                email: 'admin@ustalar.com',
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
initDemoAccounts();

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
        serviceCategory?: string,
        userType?: string,  // Added: Store userType directly
        pushToken?: string, // Added: Push notification token
        acceptedLegalVersion?: string,
        marketingAllowed?: boolean
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
        if (data.userType !== undefined) store.userType = data.userType;  // Save userType directly
        if (data.pushToken !== undefined) store.pushToken = data.pushToken;  // Save push token
        if (data.acceptedLegalVersion !== undefined) store.acceptedLegalVersion = data.acceptedLegalVersion;
        if (data.marketingAllowed !== undefined) store.marketingAllowed = data.marketingAllowed;
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
        // Prefer stored userType if available, otherwise use the argument
        const finalUserType = store.userType || userType;

        return {
            id: userId,
            fullName: (store.fullName && store.fullName.trim() !== '') ? store.fullName : 'Test Kullanıcısı',
            email: store.email || 'mock@example.com',
            passwordHash: store.passwordHash,
            phone: store.phone || '',
            userType: finalUserType,
            profileImageUrl: store.profileImageUrl || null,
            isVerified: store.isVerified || false,
            isActive: store.isActive !== undefined ? store.isActive : true,
            verificationStatus: store.verificationStatus || null,
            documentType: store.documentType || null,
            submittedAt: store.submittedAt || null,
            acceptedLegalVersion: store.acceptedLegalVersion || null,
            marketingAllowed: store.marketingAllowed || false,
            serviceCategory: store.serviceCategory || null,
            electricianProfile: finalUserType === 'ELECTRICIAN' ? {
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
                },
                serviceCategory: store.serviceCategory || 'elektrik'
            } : null
        };
    },

    getLegalDocs: () => {
        return legalDocuments.filter(d => d.isActive);
    },

    addConsent: (consent: Omit<UserConsent, 'id' | 'createdAt'>) => {
        const newConsent: UserConsent = {
            id: `consent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            ...consent,
            createdAt: new Date().toISOString()
        };
        userConsents.push(newConsent);
        saveConsentsToDisk();

        // Update user's version if it's an acceptance
        if (consent.userId && consent.action === 'ACCEPTED') {
            const user = mockStore[consent.userId];
            if (user) {
                user.acceptedLegalVersion = consent.documentVersion;
                saveToDisk();
            }
        }
        return newConsent;
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
// Returns raw store with derived userType for each user
export const getAllMockUsers = () => {
    const result: { [key: string]: any } = {};
    for (const id of Object.keys(mockStore)) {
        // Derive userType from ID suffix if not explicitly set
        let userType = mockStore[id].userType;
        if (!userType) {
            if (id.endsWith('-ELECTRICIAN')) {
                userType = 'ELECTRICIAN';
            } else if (id.endsWith('-ADMIN')) {
                userType = 'ADMIN';
            } else {
                userType = 'CITIZEN';
            }
        }
        result[id] = { ...mockStore[id], id, userType };
    }
    return result;
};

// ============== MOCK CREDIT TRANSACTIONS STORAGE ==============

interface MockTransaction {
    id: string;
    userId: string;
    amount: number;
    transactionType: 'PURCHASE' | 'BID_SPENT' | 'REFUND' | 'BONUS';
    description: string;
    balanceAfter: number;
    createdAt: string;
}

const TRANSACTIONS_FILE = path.join(DATA_DIR, 'mock_transactions.json');

// Load transactions from file
let mockTransactions: MockTransaction[] = [];
if (fs.existsSync(TRANSACTIONS_FILE)) {
    try {
        const txData = fs.readFileSync(TRANSACTIONS_FILE, 'utf8');
        mockTransactions = JSON.parse(txData);
        console.log(`💳 Mock transactions loaded: ${mockTransactions.length} transactions`);
    } catch (error) {
        console.error('❌ Failed to load mock transactions:', error);
        mockTransactions = [];
    }
}

const saveTransactionsToDisk = () => {
    try {
        fs.writeFileSync(TRANSACTIONS_FILE, JSON.stringify(mockTransactions, null, 2), 'utf8');
    } catch (error) {
        console.error('❌ Failed to save mock transactions:', error);
    }
};

export const mockTransactionStorage = {
    // Add a new transaction
    addTransaction: (data: Omit<MockTransaction, 'id' | 'createdAt'>) => {
        const transaction: MockTransaction = {
            id: `mock-tx-${Date.now()}`,
            ...data,
            createdAt: new Date().toISOString()
        };
        mockTransactions.unshift(transaction); // Add to beginning for chronological order
        saveTransactionsToDisk();
        return transaction;
    },

    // Get transactions for a user
    getTransactions: (userId: string, limit: number = 50) => {
        return mockTransactions
            .filter(tx => tx.userId === userId)
            .slice(0, limit);
    },

    // Get all transactions
    getAllTransactions: () => mockTransactions
};

// ============== MOCK FAVORITES STORAGE ==============

interface MockFavorite {
    id: string;
    userId: string;
    electricianId: string;
    createdAt: string;
}

const FAVORITES_FILE = path.join(DATA_DIR, 'mock_favorites.json');

// Load favorites from file
let mockFavorites: MockFavorite[] = [];
if (fs.existsSync(FAVORITES_FILE)) {
    try {
        const favData = fs.readFileSync(FAVORITES_FILE, 'utf8');
        mockFavorites = JSON.parse(favData);
        console.log(`❤️ Mock favorites loaded: ${mockFavorites.length} favorites`);
    } catch (error) {
        console.error('❌ Failed to load mock favorites:', error);
        mockFavorites = [];
    }
}

const saveFavoritesToDisk = () => {
    try {
        fs.writeFileSync(FAVORITES_FILE, JSON.stringify(mockFavorites, null, 2), 'utf8');
    } catch (error) {
        console.error('❌ Failed to save mock favorites:', error);
    }
};

export const mockFavoriteStorage = {
    // Get favorites for a user
    getFavorites: (userId: string) => {
        return mockFavorites.filter(fav => fav.userId === userId);
    },

    // Add a favorite
    addFavorite: (userId: string, electricianId: string) => {
        // Already favorited?
        const exists = mockFavorites.find(f => f.userId === userId && f.electricianId === electricianId);
        if (exists) return exists;

        const favorite: MockFavorite = {
            id: `mock-fav-${Date.now()}`,
            userId,
            electricianId,
            createdAt: new Date().toISOString()
        };
        mockFavorites.unshift(favorite);
        saveFavoritesToDisk();
        return favorite;
    },

    // Remove a favorite
    removeFavorite: (userId: string, electricianId: string) => {
        const initialLength = mockFavorites.length;
        mockFavorites = mockFavorites.filter(f => !(f.userId === userId && f.electricianId === electricianId));
        if (mockFavorites.length !== initialLength) {
            saveFavoritesToDisk();
            return true;
        }
        return false;
    },

    // Check if favorited
    isFavorite: (userId: string, electricianId: string) => {
        return mockFavorites.some(f => f.userId === userId && f.electricianId === electricianId);
    }
};

// ============== MOCK SUPPORT TICKETS STORAGE ==============

interface MockSupportTicket {
    id: string;
    userId: string;
    ticketType: string;
    subject: string;
    description: string;
    status: string;
    priority: string;
    createdAt: string;
    messages: Array<{
        id: string;
        senderId: string;
        text: string;
        createdAt: string;
        isAdmin: boolean;
    }>;
}

const TICKETS_FILE = path.join(DATA_DIR, 'mock_tickets.json');

let mockTickets: MockSupportTicket[] = [];
if (fs.existsSync(TICKETS_FILE)) {
    try {
        mockTickets = JSON.parse(fs.readFileSync(TICKETS_FILE, 'utf8'));
        console.log(`🎫 Mock tickets loaded: ${mockTickets.length} tickets`);
    } catch (error) {
        mockTickets = [];
    }
}

const saveTicketsToDisk = () => {
    try {
        fs.writeFileSync(TICKETS_FILE, JSON.stringify(mockTickets, null, 2), 'utf8');
    } catch (error) {
        console.error('❌ Failed to save mock tickets:', error);
    }
};

export const mockTicketStorage = {
    addTicket: (data: Omit<MockSupportTicket, 'id' | 'createdAt' | 'status' | 'messages'>) => {
        const ticket: MockSupportTicket = {
            id: `ticket-${Date.now()}`,
            ...data,
            status: 'open',
            createdAt: new Date().toISOString(),
            messages: []
        };
        mockTickets.unshift(ticket);
        saveTicketsToDisk();
        return ticket;
    },

    addMessage: (ticketId: string, message: { senderId: string, text: string, isAdmin: boolean }) => {
        const ticket = mockTickets.find(t => t.id === ticketId);
        if (ticket) {
            if (!ticket.messages) ticket.messages = [];
            ticket.messages.push({
                id: `msg-${Date.now()}`,
                ...message,
                createdAt: new Date().toISOString()
            });
            saveTicketsToDisk();
            return ticket;
        }
        return null;
    },

    getTicketsByUser: (userId: string) => {
        return mockTickets.filter(t => t.userId === userId);
    },

    getTicket: (id: string) => {
        return mockTickets.find(t => t.id === id);
    },

    getAllTickets: () => {
        return mockTickets;
    },

    updateTicket: (id: string, updates: Partial<MockSupportTicket>) => {
        const ticket = mockTickets.find(t => t.id === id);
        if (ticket) {
            Object.assign(ticket, updates);
            saveTicketsToDisk();
            return ticket;
        }
        return null;
    }
};

export default mockStorage;
