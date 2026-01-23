import api from './api';

export interface LegalDocument {
    id: string;
    type: 'KVKK' | 'TERMS' | 'PRIVACY' | 'MARKETING';
    version: string;
    title: string;
    content: string;
    isActive: boolean;
    updatedAt: string;
}

export interface UserConsentPayload {
    documentType: string;
    documentVersion: string;
    action: 'ACCEPTED' | 'REJECTED';
    marketingAllowed?: boolean;
}

export const getLegalDocuments = async (): Promise<LegalDocument[]> => {
    const response = await api.get('legal/texts');
    return response.data.data;
};

export const recordConsent = async (payload: UserConsentPayload) => {
    const response = await api.post('legal/consent', payload);
    return response.data;
};

export const legalService = {
    getLegalDocuments,
    recordConsent,
};
