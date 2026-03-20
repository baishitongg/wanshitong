import { redirect } from "next/navigation";
import { DEFAULT_SHOP_SLUG } from "@/lib/constants";

export default function LegacyCartPage() {
  redirect(`/shops/${DEFAULT_SHOP_SLUG}/cart`);
}
