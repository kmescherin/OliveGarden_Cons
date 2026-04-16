"use client";

import { useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const MAX_FILES = 3;
const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function PhotoUpload({
  files,
  onChange,
}: {
  files: File[];
  onChange: (files: File[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setError("");
    const incoming = Array.from(e.target.files ?? []);
    for (const f of incoming) {
      if (!ALLOWED_TYPES.includes(f.type)) {
        setError("Only JPEG, PNG, WebP allowed");
        return;
      }
      if (f.size > MAX_SIZE) {
        setError("Max 5MB per image");
        return;
      }
    }
    const combined = [...files, ...incoming].slice(0, MAX_FILES);
    onChange(combined);
    if (inputRef.current) inputRef.current.value = "";
  }

  function remove(index: number) {
    onChange(files.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={files.length >= MAX_FILES}
        >
          <ImagePlus className="mr-2 h-4 w-4" />
          Add photos ({files.length}/{MAX_FILES})
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={handleChange}
          className="hidden"
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-2">
        {files.map((f, i) => (
          <div key={i} className="relative h-16 w-16">
            <img
              src={URL.createObjectURL(f)}
              alt={`Photo ${i + 1}`}
              className="h-16 w-16 rounded object-cover"
            />
            <button
              type="button"
              onClick={() => remove(i)}
              className="absolute -right-1 -top-1 rounded-full bg-destructive p-0.5 text-destructive-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
