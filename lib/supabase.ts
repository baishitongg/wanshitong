import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Client-side Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const BUCKET_NAME = "product";

function getSupabaseAdmin() {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!serviceRoleKey) {
        throw new Error("SUPABASE_SERVICE_ROLE_KEY is required");
    }

    return createClient(supabaseUrl, serviceRoleKey);
}

/**
 * Generate a signed upload URL for direct browser upload.
 */
export async function getSignedUploadUrl(fileName: string, folder = "products") {
    const safeFileName = fileName.replace(/\s+/g, "-");
    const safeFolder = folder
        .trim()
        .replace(/^\/+|\/+$/g, "")
        .replace(/[^a-zA-Z0-9/_-]/g, "") || "products";
    const path = `${safeFolder}/${Date.now()}-${safeFileName}`;

    const { data, error } = await getSupabaseAdmin().storage
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
    const { data } = getSupabaseAdmin().storage.from(BUCKET_NAME).getPublicUrl(path);
    return data.publicUrl;
}
