"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import type { ElectionCandidate } from "@/types/database";
import { saveCandidate, deleteCandidate } from "./election-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Plus, Trash2, Pencil } from "lucide-react";
import { getActionErrorMessage } from "@/lib/action-error-message";

function CandidateCard({
  candidate,
  locale,
}: {
  candidate: ElectionCandidate;
  locale: string;
}) {
  const t = useTranslations("Elections");
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState(candidate.full_name);
  const [program, setProgram] = useState(candidate.program ?? "");
  const [electionYear, setElectionYear] = useState(
    String(candidate.election_year),
  );
  const [sortOrder, setSortOrder] = useState(String(candidate.sort_order));

  async function handleSave() {
    if (!fullName) return;
    setLoading(true);
    const fd = new FormData();
    fd.set("full_name", fullName);
    fd.set("program", program);
    fd.set("election_year", electionYear);
    fd.set("sort_order", sortOrder);
    const res = await saveCandidate(locale, candidate.id, fd);
    setLoading(false);
    if (!res.ok) {
      toast.error(getActionErrorMessage(res.error));
      return;
    }
    toast.success(t("save"));
    setEditing(false);
    router.refresh();
  }

  async function handleDelete() {
    setLoading(true);
    const res = await deleteCandidate(locale, candidate.id);
    setLoading(false);
    if (!res.ok) {
      toast.error(getActionErrorMessage(res.error));
      return;
    }
    toast.success(t("delete"));
    router.refresh();
  }

  if (editing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("editCandidate")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2">
            <Label>{t("fullName")}</Label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label>{t("program")}</Label>
            <Textarea
              rows={3}
              value={program}
              onChange={(e) => setProgram(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label>{t("electionYear")}</Label>
            <Input
              type="number"
              value={electionYear}
              onChange={(e) => setElectionYear(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label>{t("sortOrder")}</Label>
            <Input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={loading || !fullName}>
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
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">{candidate.full_name}</CardTitle>
          <span className="text-sm text-muted-foreground">
            {candidate.election_year}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {candidate.program && (
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {candidate.program}
          </p>
        )}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditing(true)}
          >
            <Pencil className="mr-1 h-3 w-3" />
            {t("editCandidate")}
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
      </CardContent>
    </Card>
  );
}

function NewCandidateForm({ locale }: { locale: string }) {
  const t = useTranslations("Elections");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState("");
  const [program, setProgram] = useState("");
  const [electionYear, setElectionYear] = useState(
    String(new Date().getFullYear()),
  );
  const [sortOrder, setSortOrder] = useState("0");

  async function handleSave() {
    if (!fullName) return;
    setLoading(true);
    const fd = new FormData();
    fd.set("full_name", fullName);
    fd.set("program", program);
    fd.set("election_year", electionYear);
    fd.set("sort_order", sortOrder);
    const res = await saveCandidate(locale, null, fd);
    setLoading(false);
    if (!res.ok) {
      toast.error(getActionErrorMessage(res.error));
      return;
    }
    setFullName("");
    setProgram("");
    setSortOrder("0");
    setOpen(false);
    toast.success(t("save"));
    router.refresh();
  }

  if (!open) {
    return (
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Plus className="mr-1 h-4 w-4" />
        {t("addCandidate")}
      </Button>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("addCandidate")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-2">
          <Label>{t("fullName")}</Label>
          <Input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label>{t("program")}</Label>
          <Textarea
            rows={3}
            value={program}
            onChange={(e) => setProgram(e.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label>{t("electionYear")}</Label>
          <Input
            type="number"
            value={electionYear}
            onChange={(e) => setElectionYear(e.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label>{t("sortOrder")}</Label>
          <Input
            type="number"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={loading || !fullName}>
            {t("save")}
          </Button>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={loading}
          >
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function CandidateEditor({
  candidates,
  locale,
}: {
  candidates: ElectionCandidate[];
  locale: string;
}) {
  const t = useTranslations("Elections");

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-medium">{t("boardTitle")}</h2>
      {candidates.length === 0 && (
        <p className="text-sm text-muted-foreground">{t("noCandidates")}</p>
      )}
      <div className="space-y-4">
        {candidates.map((c) => (
          <CandidateCard key={c.id} candidate={c} locale={locale} />
        ))}
      </div>
      <NewCandidateForm locale={locale} />
    </div>
  );
}
