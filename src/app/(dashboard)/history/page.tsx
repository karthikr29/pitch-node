"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Eye, Filter, Loader2, Mic, Zap, ArrowRight, Trash2, Megaphone, RotateCcw } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

interface Session {
  id: string;
  date: string;
  scenarioName: string;
  personaName: string;
  score: number | null; // null = analysis pending
  analysisReady: boolean;
  duration: number; // seconds
  callType: string;
  whatYouSell: string | null;
  targetAudience: string | null;
}

function formatDuration(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function getScoreColor(score: number) {
  if (score >= 80) return "text-green-500";
  if (score >= 60) return "text-yellow-500";
  return "text-red-500";
}

function getScoreBg(score: number) {
  if (score >= 80) return "bg-green-500/10";
  if (score >= 60) return "bg-yellow-500/10";
  return "bg-red-500/10";
}

function getScoreRing(score: number) {
  if (score >= 80) return "ring-green-500/20";
  if (score >= 60) return "ring-yellow-500/20";
  return "ring-red-500/20";
}

function getLetterGrade(score: number) {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

function parseDifficulty(scenarioName: string): string | null {
  const parts = scenarioName.split(" - ");
  return parts.length > 1 ? parts[parts.length - 1] : null;
}

function getDifficultyClass(difficulty: string | null): string {
  switch (difficulty?.toLowerCase()) {
    case "easy":   return "text-green-500 border-green-500/30 bg-green-500/5";
    case "medium": return "text-yellow-500 border-yellow-500/30 bg-yellow-500/5";
    case "hard":   return "text-red-500 border-red-500/30 bg-red-500/5";
    default:       return "";
  }
}

const PAGE_SIZE = 10;

function getPageNumbers(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "ellipsis")[] = [1];
  if (current > 3) pages.push("ellipsis");
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) {
    pages.push(p);
  }
  if (current < total - 2) pages.push("ellipsis");
  pages.push(total);
  return pages;
}

export default function HistoryPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [callTypeFilter, setCallTypeFilter] = useState("pitch");
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [practicingAgainId, setPracticingAgainId] = useState<string | null>(null);

  const fetchSessions = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: PAGE_SIZE.toString(),
      });
      if (callTypeFilter !== "all") params.set("callType", callTypeFilter);

      const res = await fetch(`/api/sessions?${params}`);
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
        setTotalPages(data.totalPages || 1);
      } else {
        setSessions([]);
      }
    } catch {
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, [page, callTypeFilter]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  async function handleDelete(sessionId: string) {
    setDeletingId(sessionId);
    try {
      const res = await fetch(`/api/sessions/${sessionId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (sessions.length === 1 && page > 1) {
        setPage((p) => p - 1); // useEffect will trigger fetchSessions
      } else {
        await fetchSessions(true);
      }
    } catch {
      toast.error("Failed to delete session");
    } finally {
      setDeletingId(null);
    }
  }

  async function handlePracticeAgain(sessionId: string) {
    setPracticingAgainId(sessionId);
    try {
      const res = await fetch(`/api/sessions/${sessionId}`);
      if (!res.ok) throw new Error("fetch failed");
      const data = await res.json();
      sessionStorage.setItem(
        "practice-prefill",
        JSON.stringify({
          callType: data.scenario.callType,
          difficulty: data.scenario.difficulty,
          scenarioId: data.scenario.id,
          personaId: data.persona.id,
          pitchBriefing: data.pitchBriefing ?? null,
          inferredRole: data.inferredRole ?? null,
        })
      );
      router.push("/practice");
    } catch {
      toast.error("Failed to start practice session");
      setPracticingAgainId(null);
    }
  }

  // Poll every 5s while any session is still being analyzed
  useEffect(() => {
    const hasPending = sessions.some((s) => !s.analysisReady);
    if (!hasPending) return;
    const timer = setInterval(() => { fetchSessions(true); }, 5000);
    return () => clearInterval(timer);
  }, [sessions, fetchSessions]);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-display font-bold text-foreground tracking-tight">
            Session History
          </h2>
          <p className="text-muted-foreground mt-1">
            Review your past practice sessions and track improvement
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select
            value={callTypeFilter}
            onValueChange={(val) => {
              setCallTypeFilter(val);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[160px] h-9 text-sm">
              <SelectValue placeholder="Call Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="pitch">Pitch</SelectItem>
              <SelectItem value="cold-call" disabled>Cold Call — Soon</SelectItem>
              <SelectItem value="discovery" disabled>Discovery — Soon</SelectItem>
              <SelectItem value="demo" disabled>Demo — Soon</SelectItem>
              <SelectItem value="negotiation" disabled>Negotiation — Soon</SelectItem>
              <SelectItem value="follow-up" disabled>Follow-Up — Soon</SelectItem>
              <SelectItem value="closing" disabled>Closing — Soon</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="py-4">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-8 w-16" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="relative mx-auto w-16 h-16 mb-4">
              <div className="absolute inset-0 rounded-2xl bg-primary/5 animate-pulse" />
              <div className="absolute inset-2 rounded-xl bg-primary/10 flex items-center justify-center">
                <Mic className="w-6 h-6 text-primary" />
              </div>
            </div>
            <p className="font-medium text-foreground">No sessions found</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-[280px] mx-auto">
              {callTypeFilter !== "all"
                ? "Try a different filter or complete a practice session."
                : "Complete a practice session to see it listed here."}
            </p>
            <div className="flex items-center justify-center gap-2 mt-4">
              {callTypeFilter !== "all" && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCallTypeFilter("all")}
                >
                  Clear filter
                </Button>
              )}
              <Button size="sm" asChild>
                <Link href="/practice">
                  <Zap className="w-3.5 h-3.5 mr-1.5" />
                  Start Practicing
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Mobile: Card-based layout */}
          <div className="space-y-2 md:hidden">
            {sessions.map((session) => (
              <Card key={session.id} className="hover:shadow-md hover:border-primary/30 transition-all group">
                <CardContent className="py-3.5 px-4">
                  <div className="flex items-center gap-3">
                    <Link href={`/history/${session.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                      {!session.analysisReady ? (
                        <div className="shrink-0 h-11 w-11 rounded-xl flex flex-col items-center justify-center bg-muted/60 ring-1 ring-border">
                          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                        </div>
                      ) : (
                        <div
                          className={cn(
                            "shrink-0 h-11 w-11 rounded-xl flex flex-col items-center justify-center ring-1",
                            getScoreBg(session.score ?? 0),
                            getScoreRing(session.score ?? 0)
                          )}
                        >
                          <span
                            className={cn(
                              "text-sm font-bold tabular-nums leading-none",
                              getScoreColor(session.score ?? 0)
                            )}
                          >
                            {((session.score ?? 0) / 10).toFixed(1)}
                          </span>
                          <span className="text-[9px] text-muted-foreground mt-0.5">
                            {getLetterGrade(session.score ?? 0)}
                          </span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-foreground truncate group-hover:text-primary transition-colors">
                          {session.whatYouSell
                            ? <>
                                {session.whatYouSell}
                                {session.targetAudience
                                  ? <span className="font-normal text-muted-foreground"> → {session.targetAudience}</span>
                                  : null}
                              </>
                            : session.scenarioName.split(" - ")[0]
                          }
                        </p>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(session.date), "MMM d, h:mm a")}
                          </span>
                          <span className="text-border">·</span>
                          <span className="text-xs text-muted-foreground">
                            {formatDuration(session.duration)}
                          </span>
                          <span className="text-border">·</span>
                          <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-primary/10 border border-primary/20">
                            <Megaphone className="w-2.5 h-2.5 text-primary" />
                            <span className="text-[10px] font-medium text-primary capitalize">
                              {(session.callType || "").replace(/[-_]/g, " ")}
                            </span>
                          </div>
                          {(() => {
                            const diff = parseDifficulty(session.scenarioName);
                            return diff ? (
                              <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", getDifficultyClass(diff))}>
                                {diff}
                              </Badge>
                            ) : null;
                          })()}
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handlePracticeAgain(session.id)}
                      disabled={practicingAgainId === session.id}
                      className="text-primary shrink-0 px-2"
                    >
                      {practicingAgainId === session.id
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <RotateCcw className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSessionToDelete(session.id)}
                      disabled={deletingId === session.id}
                      className="text-red-500 hover:text-red-700 shrink-0 px-2"
                    >
                      {deletingId === session.id
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <Trash2 className="h-4 w-4" />}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Desktop: Table layout */}
          <Card className="hidden md:block">
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Scenario</TableHead>
                    <TableHead className="hidden lg:table-cell text-center">Persona</TableHead>
                    <TableHead className="text-center">Score</TableHead>
                    <TableHead className="hidden lg:table-cell text-center">Duration</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.map((session) => (
                    <TableRow
                      key={session.id}
                      className="group hover:bg-muted/40 transition-colors"
                    >
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(session.date), "MMM d, yyyy 'at' h:mm a")}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1.5">
                          <p className="font-medium text-foreground text-sm leading-snug">
                            {session.whatYouSell
                              ? <>
                                  {session.whatYouSell}
                                  {session.targetAudience && (
                                    <span className="text-muted-foreground font-normal"> → {session.targetAudience}</span>
                                  )}
                                </>
                              : session.scenarioName.split(" - ")[0]
                            }
                          </p>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-primary/10 border border-primary/20">
                              <Megaphone className="w-3 h-3 text-primary" />
                              <span className="text-[10px] font-medium text-primary capitalize">
                                {(session.callType || "").replace(/[-_]/g, " ")}
                              </span>
                            </div>
                            {(() => {
                              const diff = parseDifficulty(session.scenarioName);
                              return diff ? (
                                <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", getDifficultyClass(diff))}>
                                  {diff}
                                </Badge>
                              ) : null;
                            })()}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground text-center">
                        {session.personaName}
                      </TableCell>
                      <TableCell className="text-center">
                        {!session.analysisReady ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted/60">
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">Analyzing...</span>
                          </div>
                        ) : (
                          <div
                            className={cn(
                              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg",
                              getScoreBg(session.score ?? 0)
                            )}
                          >
                            <span
                              className={cn(
                                "font-bold text-sm tabular-nums",
                                getScoreColor(session.score ?? 0)
                              )}
                            >
                              {((session.score ?? 0) / 10).toFixed(1)}/10
                            </span>
                            <span
                              className={cn(
                                "text-xs font-semibold",
                                getScoreColor(session.score ?? 0)
                              )}
                            >
                              {getLetterGrade(session.score ?? 0)}
                            </span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground tabular-nums text-center">
                        {formatDuration(session.duration)}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="opacity-70 group-hover:opacity-100 transition-opacity"
                            asChild
                          >
                            <Link href={`/history/${session.id}`}>
                              <Eye className="w-4 h-4 mr-1" />
                              Review
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePracticeAgain(session.id)}
                            disabled={practicingAgainId === session.id}
                            className="opacity-70 group-hover:opacity-100 transition-opacity text-primary hover:text-primary"
                          >
                            {practicingAgainId === session.id
                              ? <Loader2 className="h-4 w-4 animate-spin" />
                              : <><RotateCcw className="w-3.5 h-3.5 mr-1" />Again</>
                            }
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSessionToDelete(session.id)}
                            disabled={deletingId === session.id}
                            className="text-red-500 hover:text-red-700 opacity-70 group-hover:opacity-100 transition-opacity"
                          >
                            {deletingId === session.id
                              ? <Loader2 className="h-4 w-4 animate-spin" />
                              : <Trash2 className="h-4 w-4" />}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Pagination */}
          {totalPages > 1 && (
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (page > 1) setPage(page - 1);
                    }}
                    className={
                      page <= 1 ? "pointer-events-none opacity-50" : ""
                    }
                  />
                </PaginationItem>
                {getPageNumbers(page, totalPages).map((p, i) =>
                  p === "ellipsis" ? (
                    <PaginationItem key={`ellipsis-${i}`}>
                      <PaginationEllipsis />
                    </PaginationItem>
                  ) : (
                    <PaginationItem key={p}>
                      <PaginationLink
                        href="#"
                        isActive={p === page}
                        onClick={(e) => {
                          e.preventDefault();
                          setPage(p);
                        }}
                      >
                        {p}
                      </PaginationLink>
                    </PaginationItem>
                  )
                )}
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (page < totalPages) setPage(page + 1);
                    }}
                    className={
                      page >= totalPages
                        ? "pointer-events-none opacity-50"
                        : ""
                    }
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </>
      )}
      <AlertDialog open={!!sessionToDelete} onOpenChange={() => setSessionToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Session</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this session and all its data including transcripts and scores.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { handleDelete(sessionToDelete!); setSessionToDelete(null); }}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
