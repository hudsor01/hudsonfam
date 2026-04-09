"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { Card } from "@/components/ui/card";
import { ExternalLink } from "lucide-react";
import { JOB_STATUSES } from "@/lib/job-constants";
import { sourceColors } from "./columns";
import type { Job } from "@/lib/jobs-db";

const KANBAN_COLUMNS = JOB_STATUSES;

const columnColors: Record<string, { header: string; dot: string; count: string }> = {
  new: { header: "text-primary", dot: "bg-primary", count: "bg-primary/15 text-primary" },
  interested: { header: "text-accent", dot: "bg-accent", count: "bg-accent/15 text-accent" },
  applied: { header: "text-status-applied", dot: "bg-status-applied", count: "bg-status-applied/15 text-status-applied" },
  interview: { header: "text-status-interview", dot: "bg-status-interview", count: "bg-status-interview/15 text-status-interview" },
  offer: { header: "text-status-offer", dot: "bg-status-offer", count: "bg-status-offer/15 text-status-offer" },
  rejected: { header: "text-destructive/60", dot: "bg-destructive/60", count: "bg-destructive/15 text-destructive/60" },
};

interface KanbanBoardProps {
  jobs: Job[];
  jobsByStatus: Record<string, Job[]>;
  hasActiveFilters: boolean;
  onStatusChange: (jobId: number, newStatus: string) => void;
}

export function KanbanBoard({ jobs, jobsByStatus, hasActiveFilters, onStatusChange }: KanbanBoardProps) {
  // Pending drag tracks an optimistic move before the server round-trip completes
  const [pendingDrag, setPendingDrag] = useState<{
    jobId: number;
    from: string;
    to: string;
    index: number;
  } | null>(null);

  // Clear pending drag when server data catches up (external system sync)
  useEffect(() => {
    if (!pendingDrag) return;
    const fromCol = hasActiveFilters
      ? jobs.filter((j) => j.status === pendingDrag.from)
      : jobsByStatus[pendingDrag.from] || [];
    const stillPending = fromCol.some((j) => j.id === pendingDrag.jobId);
    if (!stillPending) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPendingDrag(null);
    }
  }, [jobs, jobsByStatus, hasActiveFilters, pendingDrag]);

  const columns = useMemo(() => {
    const grouped: Record<string, Job[]> = {};
    if (hasActiveFilters) {
      for (const status of KANBAN_COLUMNS) {
        grouped[status] = jobs.filter((j) => j.status === status);
      }
    } else {
      for (const status of KANBAN_COLUMNS) {
        grouped[status] = jobsByStatus[status] || [];
      }
    }

    if (pendingDrag) {
      const job = grouped[pendingDrag.from]?.find((j) => j.id === pendingDrag.jobId);
      if (job) {
        grouped[pendingDrag.from] = grouped[pendingDrag.from].filter((j) => j.id !== pendingDrag.jobId);
        const dest = [...grouped[pendingDrag.to]];
        dest.splice(pendingDrag.index, 0, { ...job, status: pendingDrag.to });
        grouped[pendingDrag.to] = dest;
      }
    }
    return grouped;
  }, [jobs, jobsByStatus, hasActiveFilters, pendingDrag]);

  const handleDragEnd = useCallback(
    (result: DropResult) => {
      const { source, destination, draggableId } = result;
      if (!destination) return;
      if (
        source.droppableId === destination.droppableId &&
        source.index === destination.index
      )
        return;

      const jobId = parseInt(draggableId, 10);
      const destCol = destination.droppableId;

      setPendingDrag({
        jobId,
        from: source.droppableId,
        to: destCol,
        index: destination.index,
      });

      onStatusChange(jobId, destCol);
    },
    [onStatusChange]
  );

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-4">
        {KANBAN_COLUMNS.map((status) => {
          const colJobs = columns[status] || [];
          const colors = columnColors[status];

          return (
            <div key={status} className="flex-shrink-0 w-64">
              <div className="flex items-center gap-2 mb-3 px-1">
                <span className={`size-2 rounded-full ${colors.dot}`} />
                <span className={`text-sm font-medium capitalize ${colors.header}`}>
                  {status}
                </span>
                <span
                  className={`text-[11px] px-1.5 py-0.5 rounded-full font-medium ${colors.count}`}
                >
                  {colJobs.length}
                </span>
              </div>

              <Droppable droppableId={status}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`min-h-[200px] rounded-lg p-2 space-y-2 transition-colors ${
                      snapshot.isDraggingOver
                        ? "bg-primary/5 border border-primary/20"
                        : "bg-card/30 border border-transparent"
                    }`}
                  >
                    {colJobs.map((job, index) => (
                      <Draggable
                        key={job.id}
                        draggableId={String(job.id)}
                        index={index}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                          >
                            <Card
                              hover
                              padding="sm"
                              className={`cursor-grab active:cursor-grabbing ${
                                snapshot.isDragging
                                  ? "shadow-lg shadow-primary/20 rotate-1 scale-105"
                                  : ""
                              }`}
                            >
                              <div className="flex items-start justify-between gap-1">
                                <span className="text-sm font-medium text-foreground line-clamp-2 leading-tight">
                                  {job.title}
                                </span>
                                {job.url && (
                                  <a
                                    href={job.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-muted-foreground hover:text-primary transition-colors shrink-0 mt-0.5"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <ExternalLink className="size-3" />
                                  </a>
                                )}
                              </div>

                              {job.company && (
                                <div className="text-xs text-muted-foreground mt-1 truncate">
                                  {job.company}
                                </div>
                              )}

                              <div className="flex items-center justify-between mt-2">
                                <span
                                  className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium border ${
                                    sourceColors[job.source] ||
                                    "bg-card text-muted-foreground border-border"
                                  }`}
                                >
                                  {job.source
                                    .replace("serpapi_", "")
                                    .replace(/_/g, " ")}
                                </span>
                                {job.match_score > 0 && (
                                  <span
                                    className={`text-xs font-medium ${
                                      job.match_score >= 7
                                        ? "text-score-high"
                                        : job.match_score >= 4
                                          ? "text-score-mid"
                                          : "text-muted-foreground"
                                    }`}
                                  >
                                    {job.match_score}/10
                                  </span>
                                )}
                              </div>
                            </Card>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}

                    {colJobs.length === 0 && (
                      <div className="text-xs text-muted-foreground text-center py-8">
                        No {status} jobs
                      </div>
                    )}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}
