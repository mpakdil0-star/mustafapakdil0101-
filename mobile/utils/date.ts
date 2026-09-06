export const formatRelativeTime = (dateString: string): string => {
    if (!dateString) return '';

    const date = new Date(dateString);
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
