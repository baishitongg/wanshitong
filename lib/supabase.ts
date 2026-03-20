import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Client-side Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Server-side Supabase with service role key
export const supabaseAdmin = createClient(
    supabaseUrl,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const BUCKET_NAME = "product";

/**
 * Generate a signed upload URL for direct browser upload.
 */
export async function getSignedUploadUrl(fileName: string) {
    const safeFileName = fileName.replace(/\s+/g, "-");
    const path = `products/${Date.now()}-${safeFileName}`;

    const { data, error } = await supabaseAdmin.storage
        .from(BUCKET_NAME)
        .createSignedUploadUrl(path);

    if (error) throw error;

    return {
        ...data,
        path,
    };
}

/**
 * Get a public URL for a stored image.
 */
export function getPublicUrl(path: string) {
    const { data } = supabaseAdmin.storage.from(BUCKET_NAME).getPublicUrl(path);
    return data.publicUrl;
}