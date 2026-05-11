"use client";

import { useState } from "react";
import { upsertContentPage, upsertSocialZone, upsertAnnouncement, deleteAnnouncement, upsertBoardMember, deleteBoardMember } from "./board-content-actions";
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
import { getActionErrorMessage } from "@/lib/action-error-message";

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
      toast.error(getActionErrorMessage(res.error));
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
      toast.error(getActionErrorMessage(res.error));
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

export function AnnouncementEditor({
  announcement,
}: {
  announcement?: {
    id: string;
    title: string;
    body: string | null;
    visibility: "public" | "residents";
  };
}) {
  const [title, setTitle] = useState(announcement?.title ?? "");
  const [body, setBody] = useState(announcement?.body ?? "");
  const [visibility, setVisibility] = useState(
    announcement?.visibility ?? "residents",
  );
  const [loading, setLoading] = useState(false);

  async function save() {
    setLoading(true);
    const res = await upsertAnnouncement({
      id: announcement?.id,
      title,
      body,
      visibility,
    });
    setLoading(false);
    if (!res.ok) {
      toast.error(getActionErrorMessage(res.error));
      return;
    }
    toast.success("Saved");
  }

  async function remove() {
    if (!announcement?.id) return;
    setLoading(true);
    const res = await deleteAnnouncement(announcement.id);
    setLoading(false);
    if (!res.ok) {
      toast.error(getActionErrorMessage(res.error));
      return;
    }
    toast.success("Deleted");
  }

  return (
    <div className="space-y-3 rounded-xl border p-4">
      <div className="grid gap-2">
        <Label>Title</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="grid gap-2">
        <Label>Body</Label>
        <Textarea
          rows={4}
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
      </div>
      <div className="grid gap-2">
        <Label>Visibility</Label>
        <Select
          value={visibility}
          onValueChange={(v) =>
            setVisibility((v ?? "residents") as "public" | "residents")
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
      <div className="flex gap-2">
        <Button onClick={save} disabled={loading}>
          Save
        </Button>
        {announcement?.id && (
          <Button variant="destructive" onClick={remove} disabled={loading}>
            Delete
          </Button>
        )}
      </div>
    </div>
  );
}

export function BoardMemberEditor({
  member,
}: {
  member?: {
    id: string;
    full_name: string;
    role_title: string | null;
    phone: string | null;
    email: string | null;
    sort_order: number;
  };
}) {
  const [fullName, setFullName] = useState(member?.full_name ?? "");
  const [roleTitle, setRoleTitle] = useState(member?.role_title ?? "");
  const [phone, setPhone] = useState(member?.phone ?? "");
  const [email, setEmail] = useState(member?.email ?? "");
  const [sortOrder, setSortOrder] = useState(String(member?.sort_order ?? 0));
  const [loading, setLoading] = useState(false);

  async function save() {
    setLoading(true);
    const res = await upsertBoardMember({
      id: member?.id,
      full_name: fullName,
      role_title: roleTitle,
      phone,
      email,
      sort_order: Number(sortOrder) || 0,
    });
    setLoading(false);
    if (!res.ok) {
      toast.error(getActionErrorMessage(res.error));
      return;
    }
    toast.success("Saved");
  }

  async function remove() {
    if (!member?.id) return;
    setLoading(true);
    const res = await deleteBoardMember(member.id);
    setLoading(false);
    if (!res.ok) {
      toast.error(getActionErrorMessage(res.error));
      return;
    }
    toast.success("Deleted");
  }

  return (
    <div className="space-y-3 rounded-xl border p-4">
      <div className="grid gap-2">
        <Label>Full name</Label>
        <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
      </div>
      <div className="grid gap-2">
        <Label>Role title</Label>
        <Input value={roleTitle} onChange={(e) => setRoleTitle(e.target.value)} />
      </div>
      <div className="grid gap-2">
        <Label>Phone</Label>
        <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
      </div>
      <div className="grid gap-2">
        <Label>Email</Label>
        <Input value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="grid gap-2">
        <Label>Sort</Label>
        <Input
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
        />
      </div>
      <div className="flex gap-2">
        <Button onClick={save} disabled={loading}>
          Save
        </Button>
        {member?.id && (
          <Button variant="destructive" onClick={remove} disabled={loading}>
            Delete
          </Button>
        )}
      </div>
    </div>
  );
}
