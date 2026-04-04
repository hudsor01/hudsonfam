export const JOB_STATUSES = [
  "new",
  "interested",
  "applied",
  "interview",
  "offer",
  "rejected",
] as const;

export type JobStatus = (typeof JOB_STATUSES)[number] | "dismissed";
