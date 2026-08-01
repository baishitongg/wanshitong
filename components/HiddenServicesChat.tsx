import { MessageCircle } from "lucide-react";

type HiddenServicesChatProps = {
  show?: boolean;
};

export default function HiddenServicesChat({ show = true }: HiddenServicesChatProps) {
  if (!show) return null;

  return (
    <a
      href="https://t.me/nhlg09"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="想了解更多隐藏服务？点击联系"
      className="fixed bottom-4 right-4 z-50 inline-flex max-w-[calc(100vw-2rem)] items-center gap-1.5 rounded-full bg-red-700 px-3 py-2.5 text-xs font-semibold text-white shadow-lg shadow-red-900/20 transition hover:-translate-y-0.5 hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-red-200 sm:bottom-6 sm:right-6 sm:gap-2 sm:px-4 sm:py-3 sm:text-sm"
    >
      <MessageCircle className="h-5 w-5 shrink-0" />
      <span>想了解隐藏服务？</span>
      <span>联系</span>
    </a>
  );
}
