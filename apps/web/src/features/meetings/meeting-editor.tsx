"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import type { Meeting, Decision } from "@/types/database";
import { saveMeeting, deleteMeeting, saveDecision, deleteDecision } from "./meeting-actions";
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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, Plus, Trash2, Pencil } from "lucide-react";

type MeetingWithDecisions = Meeting & { decisions: Decision[] };

function statusVariant(status: string) {
  switch (status) {
    case "completed":
      return "default" as const;
    case "cancelled":
      return "destructive" as const;
    default:
      return "secondary" as const;
  }
}

function MeetingCard({
  meeting,
  locale,
}: {
  meeting: MeetingWithDecisions;
  locale: string;
}) {
  const t = useTranslations("Meetings");
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [addingDecision, setAddingDecision] = useState(false);
  const [loading, setLoading] = useState(false);

  const [title, setTitle] = useState(meeting.title);
  const [description, setDescription] = useState(meeting.description ?? "");
  const [meetingType, setMeetingType] = useState(meeting.meeting_type);
  const [scheduledAt, setScheduledAt] = useState(
    meeting.scheduled_at.slice(0, 16),
  );
  const [location, setLocation] = useState(meeting.location ?? "");
  const [agenda, setAgenda] = useState(meeting.agenda ?? "");
  const [minutes, setMinutes] = useState(meeting.minutes ?? "");
  const [status, setStatus] = useState(meeting.status);

  const [decTitle, setDecTitle] = useState("");
  const [decDescription, setDecDescription] = useState("");

  async function handleSave() {
    setLoading(true);
    const fd = new FormData();
    fd.set("title", title);
    fd.set("description", description);
    fd.set("meeting_type", meetingType);
    fd.set("scheduled_at", scheduledAt);
    fd.set("location", location);
    fd.set("agenda", agenda);
    fd.set("minutes", minutes);
    fd.set("status", status);
    const res = await saveMeeting(locale, meeting.id, fd);
    setLoading(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(t("save"));
    setEditing(false);
    router.refresh();
  }

  async function handleDelete() {
    setLoading(true);
    const res = await deleteMeeting(locale, meeting.id);
    setLoading(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(t("delete"));
    router.refresh();
  }

  async function handleAddDecision() {
    if (!decTitle) return;
    setLoading(true);
    const fd = new FormData();
    fd.set("title", decTitle);
    fd.set("description", decDescription);
    const res = await saveDecision(locale, meeting.id, null, fd);
    setLoading(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    setDecTitle("");
    setDecDescription("");
    setAddingDecision(false);
    toast.success(t("save"));
    router.refresh();
  }

  async function handleDeleteDecision(decisionId: string) {
    setLoading(true);
    const res = await deleteDecision(locale, decisionId);
    setLoading(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(t("delete"));
    router.refresh();
  }

  const typeLabel = (mt: string) => {
    switch (mt) {
      case "regular":
        return t("typeRegular");
      case "extraordinary":
        return t("typeExtraordinary");
      case "annual":
        return t("typeAnnual");
      default:
        return mt;
    }
  };

  const statusLabel = (s: string) => {
    switch (s) {
      case "scheduled":
        return t("statusScheduled");
      case "completed":
        return t("statusCompleted");
      case "cancelled":
        return t("statusCancelled");
      default:
        return s;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="text-muted-foreground"
            >
              {expanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
            <CardTitle className="text-base">{meeting.title}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{typeLabel(meeting.meeting_type)}</Badge>
            <Badge variant={statusVariant(meeting.status)}>
              {statusLabel(meeting.status)}
            </Badge>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          {new Date(meeting.scheduled_at).toLocaleString()}
          {meeting.location ? ` — ${meeting.location}` : ""}
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {editing ? (
          <div className="space-y-3">
            <div className="grid gap-2">
              <Label>{t("titleField")}</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>{t("descriptionField")}</Label>
              <Textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>{t("typeField")}</Label>
              <Select value={meetingType} onValueChange={(v) => setMeetingType((v ?? "regular") as "regular" | "extraordinary" | "annual")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="regular">{t("typeRegular")}</SelectItem>
                  <SelectItem value="extraordinary">
                    {t("typeExtraordinary")}
                  </SelectItem>
                  <SelectItem value="annual">{t("typeAnnual")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>{t("scheduledAt")}</Label>
              <Input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>{t("locationField")}</Label>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>{t("agendaField")}</Label>
              <Textarea
                rows={3}
                value={agenda}
                onChange={(e) => setAgenda(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>{t("minutesField")}</Label>
              <Textarea
                rows={3}
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>{t("statusField")}</Label>
              <Select value={status} onValueChange={(v) => setStatus((v ?? "scheduled") as "scheduled" | "completed" | "cancelled")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">
                    {t("statusScheduled")}
                  </SelectItem>
                  <SelectItem value="completed">
                    {t("statusCompleted")}
                  </SelectItem>
                  <SelectItem value="cancelled">
                    {t("statusCancelled")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={loading}>
                {t("save")}
              </Button>
              <Button
                variant="outline"
                onClick={() => setEditing(false)}
                disabled={loading}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <>
            {meeting.agenda && (
              <div>
                <p className="text-sm font-medium">{t("agendaField")}</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {meeting.agenda}
                </p>
              </div>
            )}
            {meeting.status === "completed" && meeting.minutes && (
              <div>
                <p className="text-sm font-medium">{t("minutesField")}</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {meeting.minutes}
                </p>
              </div>
            )}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditing(true)}
              >
                <Pencil className="mr-1 h-3 w-3" />
                {t("editMeeting")}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={loading}
              >
                <Trash2 className="mr-1 h-3 w-3" />
                {t("delete")}
              </Button>
            </div>
          </>
        )}

        {expanded && (
          <div className="mt-4 space-y-3 border-t pt-4">
            <h4 className="text-sm font-medium">{t("decisions")}</h4>
            {meeting.decisions.length === 0 && (
              <p className="text-sm text-muted-foreground">
                {t("noDecisions")}
              </p>
            )}
            <ul className="space-y-2">
              {meeting.decisions.map((d) => (
                <li
                  key={d.id}
                  className="flex items-start justify-between gap-2 rounded-lg border p-3"
                >
                  <div>
                    <p className="text-sm font-medium">{d.title}</p>
                    {d.description && (
                      <p className="text-sm text-muted-foreground">
                        {d.description}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteDecision(d.id)}
                    disabled={loading}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </li>
              ))}
            </ul>
            {addingDecision ? (
              <div className="space-y-2 rounded-lg border p-3">
                <div className="grid gap-2">
                  <Label>{t("decisionTitle")}</Label>
                  <Input
                    value={decTitle}
                    onChange={(e) => setDecTitle(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>{t("decisionDescription")}</Label>
                  <Textarea
                    rows={2}
                    value={decDescription}
                    onChange={(e) => setDecDescription(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleAddDecision}
                    disabled={loading || !decTitle}
                  >
                    {t("save")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAddingDecision(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAddingDecision(true)}
              >
                <Plus className="mr-1 h-3 w-3" />
                {t("addDecision")}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function NewMeetingForm({ locale }: { locale: string }) {
  const t = useTranslations("Meetings");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [meetingType, setMeetingType] = useState("regular");
  const [scheduledAt, setScheduledAt] = useState("");
  const [location, setLocation] = useState("");
  const [agenda, setAgenda] = useState("");
  const [status, setStatus] = useState("scheduled");

  async function handleSave() {
    if (!title || !scheduledAt) return;
    setLoading(true);
    const fd = new FormData();
    fd.set("title", title);
    fd.set("description", description);
    fd.set("meeting_type", meetingType);
    fd.set("scheduled_at", scheduledAt);
    fd.set("location", location);
    fd.set("agenda", agenda);
    fd.set("status", status);
    const res = await saveMeeting(locale, null, fd);
    setLoading(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    setTitle("");
    setDescription("");
    setMeetingType("regular");
    setScheduledAt("");
    setLocation("");
    setAgenda("");
    setStatus("scheduled");
    setOpen(false);
    toast.success(t("save"));
    router.refresh();
  }

  if (!open) {
    return (
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Plus className="mr-1 h-4 w-4" />
        {t("newMeeting")}
      </Button>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("newMeeting")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-2">
          <Label>{t("titleField")}</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label>{t("descriptionField")}</Label>
          <Textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label>{t("typeField")}</Label>
          <Select value={meetingType} onValueChange={(v) => setMeetingType((v ?? "regular") as "regular" | "extraordinary" | "annual")}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="regular">{t("typeRegular")}</SelectItem>
              <SelectItem value="extraordinary">
                {t("typeExtraordinary")}
              </SelectItem>
              <SelectItem value="annual">{t("typeAnnual")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label>{t("scheduledAt")}</Label>
          <Input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label>{t("locationField")}</Label>
          <Input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label>{t("agendaField")}</Label>
          <Textarea
            rows={3}
            value={agenda}
            onChange={(e) => setAgenda(e.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label>{t("statusField")}</Label>
          <Select value={status} onValueChange={(v) => setStatus((v ?? "scheduled") as "scheduled" | "completed" | "cancelled")}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="scheduled">{t("statusScheduled")}</SelectItem>
              <SelectItem value="completed">{t("statusCompleted")}</SelectItem>
              <SelectItem value="cancelled">{t("statusCancelled")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={loading || !title || !scheduledAt}>
            {t("save")}
          </Button>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function MeetingEditor({
  meetings,
  locale,
}: {
  meetings: MeetingWithDecisions[];
  locale: string;
}) {
  const t = useTranslations("Meetings");

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-medium">{t("boardTitle")}</h2>
      {meetings.length === 0 && (
        <p className="text-sm text-muted-foreground">{t("noMeetings")}</p>
      )}
      <div className="space-y-4">
        {meetings.map((m) => (
          <MeetingCard key={m.id} meeting={m} locale={locale} />
        ))}
      </div>
      <NewMeetingForm locale={locale} />
    </div>
  );
}
