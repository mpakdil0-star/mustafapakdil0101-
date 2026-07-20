import { supabase } from './supabase';

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
    const { data, error } = await supabase.from('legal_documents').select('*').eq('isActive', true).order('type');
    if (error) throw error;
    return (data ?? []) as LegalDocument[];
};

export const recordConsent = async (payload: UserConsentPayload) => {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw userError ?? new Error('Oturum bulunamadı');
    const { data, error } = await supabase.from('user_consents').insert({ user_id: user.id, document_type: payload.documentType, document_version: payload.documentVersion, action: payload.action, marketing_allowed: payload.marketingAllowed ?? false }).select().single();
    if (error) throw error;
    return data;
};

export const legalService = {
    getLegalDocuments,
    recordConsent,
};
