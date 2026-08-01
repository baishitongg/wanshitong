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
      className="fixed bottom-5 right-5 z-50 inline-flex items-center gap-2 rounded-full bg-red-700 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-red-900/20 transition hover:-translate-y-0.5 hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-red-200 sm:bottom-6 sm:right-6"
    >
      <MessageCircle className="h-5 w-5 shrink-0" />
      <span className="hidden sm:inline">想了解隐藏服务？</span>
      <span>联系</span>
    </a>
  );
}
