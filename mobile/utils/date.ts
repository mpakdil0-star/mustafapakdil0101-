export const formatRelativeTime = (dateString: string): string => {
    if (!dateString) return '';

    let str = dateString.trim();
    if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}/.test(str)) {
        if (!str.includes('Z') && !str.includes('+') && !/-\d{2}:\d{2}$/.test(str)) {
            str = str.replace(' ', 'T') + 'Z';
        }
    }

    const date = new Date(str);
    if (isNaN(date.getTime())) return '';

    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    // Negative diff protection (clock skew / server slightly ahead)
    if (diffInSeconds < 60) {
        return 'Az önce';
    }

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
        return `${diffInMinutes} dk önce`;
    }

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
        return `${diffInHours} saat önce`;
    }

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) {
        return 'Dün';
    }
    if (diffInDays < 7) {
        return `${diffInDays} gün önce`;
    }

    const diffInWeeks = Math.floor(diffInDays / 7);
    if (diffInWeeks === 1) {
        return '1 hafta önce';
    }
    if (diffInWeeks < 4) {
        return `${diffInWeeks} hafta önce`;
    }

    // For dates within current year, show "24 Ağu" or similar
    const isCurrentYear = date.getFullYear() === now.getFullYear();
    if (isCurrentYear) {
        return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
    }

    return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });
};

/**
 * Mesaj balonları ve sohbet kartları için doğru saat formatı (HH:mm)
 * - UTC / ISO / SQL tarih formatlarını güvenle ayrıştırır.
 * - Türkiye saati (UTC+3 Europe/Istanbul) ile 24 saat formatında (örn: 14:35, 02:15) gösterir.
 * - Hermes / Android Intl motorundaki timezone ve 12/24 saat sapmalarını engeller.
 */
export const formatMessageTime = (dateInput: string | Date | number | null | undefined): string => {
    if (!dateInput) return '';

    let date: Date;

    if (dateInput instanceof Date) {
        date = dateInput;
    } else if (typeof dateInput === 'number') {
        date = new Date(dateInput);
    } else if (typeof dateInput === 'string') {
        let str = dateInput.trim();
        if (!str) return '';

        if (/^\d{10,13}$/.test(str)) {
            date = new Date(Number(str));
        } else {
            if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}/.test(str)) {
                if (!str.includes('Z') && !str.includes('+') && !/-\d{2}:\d{2}$/.test(str)) {
                    str = str.replace(' ', 'T') + 'Z';
                }
            }
            date = new Date(str);
        }
    } else {
        return '';
    }

    if (isNaN(date.getTime())) {
        return '';
    }

    try {
        return new Intl.DateTimeFormat('tr-TR', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZone: 'Europe/Istanbul',
        }).format(date);
    } catch {
        const utcTime = date.getTime() + (date.getTimezoneOffset() * 60000);
        const turkeyTime = new Date(utcTime + (3 * 3600000));
        const hours = String(turkeyTime.getHours()).padStart(2, '0');
        const minutes = String(turkeyTime.getMinutes()).padStart(2, '0');
        return `${hours}:${minutes}`;
    }
};
