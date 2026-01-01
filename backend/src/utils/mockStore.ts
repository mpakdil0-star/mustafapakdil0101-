const mockUnreadCounts = new Map<string, number>();

// Initialize with some default data
mockUnreadCounts.set('mock-conv-1', 1);

export const mockStore = {
    getUnreadCount: (convId: string) => mockUnreadCounts.get(convId) ?? 0,
    setUnreadCount: (convId: string, count: number) => mockUnreadCounts.set(convId, count),
    clearUnreadCount: (convId: string) => mockUnreadCounts.set(convId, 0),
};
