"use client";

import { useState } from "react";
import { upsertContentPage, upsertSocialZone } from "./board-content-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export function ContentPageEditor({
  slug,
  initial,
}: {
  slug: string;
  initial: { title: string; body: string; visibility: "public" | "residents" };
}) {
  const [title, setTitle] = useState(initial.title);
  const [body, setBody] = useState(initial.body);
  const [visibility, setVisibility] = useState(initial.visibility);
  const [loading, setLoading] = useState(false);

  async function save() {
    setLoading(true);
    const res = await upsertContentPage({ slug, title, body, visibility });
    setLoading(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Saved");
  }

  return (
    <div className="space-y-4 rounded-xl border p-4">
      <p className="text-sm font-medium">{slug}</p>
      <div className="grid gap-2">
        <Label>Title</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="grid gap-2">
        <Label>Body</Label>
        <Textarea
          rows={8}
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
      </div>
      <div className="grid gap-2">
        <Label>Visibility</Label>
        <Select
          value={visibility}
          onValueChange={(v) =>
            setVisibility((v ?? "public") as "public" | "residents")
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="public">public</SelectItem>
            <SelectItem value="residents">residents</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button onClick={save} disabled={loading}>
        Save
      </Button>
    </div>
  );
}

export function SocialZoneEditor({
  zone,
}: {
  zone: {
    id: string;
    name: string;
    description: string | null;
    schedule: string | null;
    sort_order: number;
  };
}) {
  const [name, setName] = useState(zone.name);
  const [description, setDescription] = useState(zone.description ?? "");
  const [schedule, setSchedule] = useState(zone.schedule ?? "");
  const [sortOrder, setSortOrder] = useState(String(zone.sort_order));
  const [loading, setLoading] = useState(false);

  async function save() {
    setLoading(true);
    const res = await upsertSocialZone({
      id: zone.id,
      name,
      description,
      schedule,
      sort_order: Number(sortOrder) || 0,
    });
    setLoading(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Saved");
  }

  return (
    <div className="space-y-3 rounded-xl border p-4">
      <div className="grid gap-2">
        <Label>Name</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="grid gap-2">
        <Label>Description</Label>
        <Textarea
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div className="grid gap-2">
        <Label>Schedule</Label>
        <Input value={schedule} onChange={(e) => setSchedule(e.target.value)} />
      </div>
      <div className="grid gap-2">
        <Label>Sort</Label>
        <Input
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
        />
      </div>
      <Button onClick={save} disabled={loading}>
        Save zone
      </Button>
    </div>
  );
}
