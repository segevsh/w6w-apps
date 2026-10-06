import type { OutputField } from "@w6w/types";

/** `VideoJob` - the body of `POST /v3/videos`, `GET /v3/videos/{id}` and each list row. */
export interface VideoBody {
  id?: string;
  status?: string;
  progress?: number | null;
  created_at?: number;
  completed_at?: number | null;
  model?: string;
  seconds?: string | null;
  size?: string | null;
  error?: { code?: string; message?: string } | null;
  provider?: string;
  cost?: number;
}

export const VIDEO_OUTPUT: OutputField[] = [
  { key: "id", type: "string", label: "Video job ID" },
  { key: "status", type: "string", label: "Status (queued, in_progress, completed, failed)" },
  { key: "done", type: "boolean", label: "Finished (completed or failed)" },
  { key: "progress", type: "number", label: "Progress (0-100)" },
  { key: "model", type: "string", label: "Model" },
  { key: "provider", type: "string", label: "Provider" },
  { key: "cost", type: "number", label: "Cost (USD); 0 until the job settles" },
  { key: "error", type: "object", label: "Error when failed" },
  { key: "createdAt", type: "number", label: "Created (Unix seconds)" },
  { key: "completedAt", type: "number", label: "Completed (Unix seconds)" },
];

export function shapeVideo(v: VideoBody): Record<string, unknown> {
  return {
    id: v.id,
    status: v.status,
    done: v.status === "completed" || v.status === "failed",
    progress: v.progress ?? undefined,
    model: v.model,
    provider: v.provider,
    cost: v.cost,
    error: v.error ?? undefined,
    createdAt: v.created_at,
    completedAt: v.completed_at ?? undefined,
  };
}
