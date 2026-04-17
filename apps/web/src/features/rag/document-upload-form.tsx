"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Upload, Trash2, FileText } from "lucide-react";

type Doc = { id: string; title: string; created_at: string };

export function DocumentUploadForm({ documents: initialDocs }: { documents: Doc[] }) {
  const t = useTranslations("Content");
  const router = useRouter();
  const [docs, setDocs] = useState<Doc[]>(initialDocs);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  async function onUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !title.trim()) return;
    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", title.trim());
    const res = await fetch("/api/rag/ingest", { method: "POST", body: formData });
    setLoading(false);
    if (!res.ok) {
      const err = await res.json();
      toast.error(err.error ?? "Upload failed");
      return;
    }
    const data = await res.json();
    setDocs((prev) => [{ id: data.documentId, title: title.trim(), created_at: new Date().toISOString() }, ...prev]);
    setTitle("");
    setFile(null);
    toast.success(`Uploaded: ${data.chunkCount} chunks`);
    router.refresh();
  }

  async function onDelete(id: string) {
    const res = await fetch("/api/rag/ingest", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId: id }),
    });
    if (res.ok) {
      setDocs((prev) => prev.filter((d) => d.id !== id));
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">{t("knowledgeBase")}</h3>
      <form onSubmit={onUpload} className="flex items-end gap-3">
        <div className="flex-1 space-y-2">
          <Label>{t("uploadDocument")}</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Document title" required />
          <Input type="file" accept=".pdf,.txt" onChange={(e) => setFile(e.target.files?.[0] ?? null)} required />
        </div>
        <Button type="submit" disabled={loading || !file}>
          <Upload className="mr-2 h-4 w-4" />
          {t("uploadDocument")}
        </Button>
      </form>
      {docs.length === 0 && (
        <p className="text-sm text-muted-foreground">{t("noDocuments")}</p>
      )}
      <div className="space-y-2">
        {docs.map((d) => (
          <div key={d.id} className="flex items-center justify-between rounded-lg border p-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{d.title}</span>
            </div>
            <Button variant="ghost" size="icon" onClick={() => onDelete(d.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
