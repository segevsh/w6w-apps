import type { ActionDefinition } from "@w6w/types";
import { SplunkClient } from "../lib/client.ts";

interface Input {
  sid: string;
}

interface Output {
  sid: string;
  dispatchState?: string;
  isDone?: boolean;
  doneProgress?: number;
  resultCount?: number;
  eventCount?: number;
  runDuration?: number;
}

interface RawJob {
  entry?: Array<{
    name?: string;
    content?: {
      dispatchState?: string;
      isDone?: boolean;
      doneProgress?: number;
      resultCount?: number;
      eventCount?: number;
      runDuration?: number;
    };
  }>;
}

/** Get a search job's status — `dispatchState`/`isDone` tell you when to stop polling. */
const searchGet: ActionDefinition<Input, Output> = {
  key: "search-get",
  type: "read",
  resource: "search",
  title: "Get Search Job Status",
  description: "Read a search job's dispatch state and progress by `sid`.",
  params: [{ key: "sid", label: "Search job ID (sid)", type: "string", required: true }],
  output: [
    { key: "sid", type: "string", label: "Search job ID" },
    { key: "dispatchState", type: "string", label: "Dispatch state (e.g. RUNNING, DONE)" },
    { key: "isDone", type: "boolean", label: "Whether the job has finished" },
    { key: "doneProgress", type: "number", label: "Progress, 0–1" },
    { key: "resultCount", type: "number", label: "Result count so far" },
    { key: "eventCount", type: "number", label: "Event count so far" },
    { key: "runDuration", type: "number", label: "Seconds the job has run" },
  ],

  async execute(input, ctx) {
    const raw = await new SplunkClient(ctx).request<RawJob>(
      `/services/search/jobs/${encodeURIComponent(input.sid)}`,
    );
    const content = raw.entry?.[0]?.content ?? {};
    return {
      sid: raw.entry?.[0]?.name ?? input.sid,
      dispatchState: content.dispatchState,
      isDone: content.isDone,
      doneProgress: content.doneProgress,
      resultCount: content.resultCount,
      eventCount: content.eventCount,
      runDuration: content.runDuration,
    };
  },
};

export default searchGet;
