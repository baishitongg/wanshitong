import ShopPaymentPage from "@/components/ShopPaymentPage";
import { requireShopBySlug } from "@/lib/shops";
import { resolveShopTheme } from "@/lib/shopTheme";

interface Props {
  params: Promise<{ shopSlug: string }>;
}

export default async function ShopPaymentRoutePage({ params }: Props) {
  const { shopSlug } = await params;
  const shop = (await requireShopBySlug(shopSlug)) as Awaited<
    ReturnType<typeof requireShopBySlug>
  > & {
    paymentQrImageUrl?: string | null;
    bankName?: string | null;
    bankAccountName?: string | null;
    bankAccountNumber?: string | null;
  };
  const theme = resolveShopTheme(shop);

  return (
    <ShopPaymentPage
      shopSlug={shop.slug}
      shopName={shop.name}
      theme={theme}
      supportWhatsApp={shop.whatsappPhone}
      supportTelegram={shop.telegramUsername}
      paymentQrImageUrl={shop.paymentQrImageUrl}
      bankName={shop.bankName}
      bankAccountName={shop.bankAccountName}
      bankAccountNumber={shop.bankAccountNumber}
    />
  );
}
