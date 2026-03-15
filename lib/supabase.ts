import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Client-side Supabase (for storage uploads from browser)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Server-side Supabase with service role key (for signed URL generation)
export const supabaseAdmin = createClient(
    supabaseUrl,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const BUCKET_NAME = "product-images";

/**
 * Generate a signed upload URL for the admin to use directly from the browser.
 * The image is uploaded directly to Supabase — never through your server.
 */
export async function getSignedUploadUrl(fileName: string) {
    const { data, error } = await supabaseAdmin.storage
        .from(BUCKET_NAME)
        .createSignedUploadUrl(`products/${Date.now()}-${fileName}`);

    if (error) throw error;
    return data;
}

/**
 * Get a public URL for a stored image.
 */
export function getPublicUrl(path: string) {
    const { data } = supabaseAdmin.storage.from(BUCKET_NAME).getPublicUrl(path);
    return data.publicUrl;
}