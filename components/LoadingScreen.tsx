"use client";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Loader2 } from "lucide-react";

export default function LoadingScreen() {
  return (
    <Dialog open>
      <DialogContent className="sm:max-w-[400px] w-[90%] p-12 rounded-2xl shadow-2xl bg-white dark:bg-background border border-border/30">
        <VisuallyHidden>
          <DialogTitle>加载中</DialogTitle>
        </VisuallyHidden>
        <div className="flex flex-col items-center justify-center gap-6">
          <div className="relative">
            <div className="absolute inset-0 blur-xl bg-primary/30 rounded-full animate-pulse" />
            <Loader2 className="relative h-12 w-12 animate-spin text-green-600" />
          </div>
          <div className="text-center space-y-2">
            <p className="text-xl font-semibold tracking-tight">正在加载</p>
            <p className="text-sm text-muted-foreground">请稍候...</p>
          </div>
          <div className="flex gap-1.5">
            <div className="h-2 w-2 rounded-full bg-primary/60 animate-bounce [animation-delay:-0.3s]" />
            <div className="h-2 w-2 rounded-full bg-primary/60 animate-bounce [animation-delay:-0.15s]" />
            <div className="h-2 w-2 rounded-full bg-primary/60 animate-bounce" />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}