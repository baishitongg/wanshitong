import { redirect } from "next/navigation";
import { DEFAULT_SHOP_SLUG } from "@/lib/constants";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function LegacyCategoryPage({ params }: Props) {
  const { id } = await params;
  redirect(`/shops/${DEFAULT_SHOP_SLUG}/category/${id}`);
}
