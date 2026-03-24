"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

type Msg = { role: "user" | "assistant"; text: string };

export function RagChatPanel() {
  const t = useTranslations("Chat");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(false);

  async function send() {
    const q = input.trim();
    if (!q) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text: q }]);
    setLoading(true);
    try {
      const res = await fetch("/api/rag/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const data = (await res.json()) as { answer?: string; error?: string };
      if (!res.ok) {
        toast.error(data.error ?? "Error");
        return;
      }
      setMessages((m) => [
        ...m,
        { role: "assistant", text: data.answer ?? "" },
      ]);
    } catch {
      toast.error("Network");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-[min(70vh,560px)] flex-col rounded-xl border bg-card">
      <ScrollArea className="flex-1 p-4">
        <ul className="space-y-3">
          {messages.map((m, i) => (
            <li
              key={i}
              className={
                m.role === "user"
                  ? "ml-8 rounded-lg bg-muted p-3 text-sm"
                  : "mr-8 rounded-lg border p-3 text-sm"
              }
            >
              {m.text}
            </li>
          ))}
        </ul>
      </ScrollArea>
      <div className="border-t p-3">
        <Textarea
          placeholder={t("placeholder")}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={2}
          className="resize-none"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
        />
        <Button
          className="mt-2"
          disabled={loading}
          onClick={() => void send()}
        >
          {t("send")}
        </Button>
      </div>
    </div>
  );
}
