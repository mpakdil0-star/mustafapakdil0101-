/**
 * Media URL compatibility helper.
 *
 * New uploads are stored as complete Supabase Storage public URLs. A relative
 * `/storage/v1/object/...` value can still exist in imported data, so resolve
 * only that well-known Supabase path against the configured project URL.
 */
export const getFileUrl = (filePath: string | null | undefined): string | null => {
  if (!filePath) return null;

  const value = filePath.trim();
  if (!value) return null;

  if (
    value.startsWith('https://')
    || value.startsWith('http://')
    || value.startsWith('data:')
    || value.startsWith('file:')
    || value.startsWith('content:')
  ) {
    return value;
  }

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim().replace(/\/$/, '');
  if (supabaseUrl && value.startsWith('/storage/v1/object/')) {
    return `${supabaseUrl}${value}`;
  }

  // Do not silently route legacy paths back to the retired Express/Render API.
  return value;
};
