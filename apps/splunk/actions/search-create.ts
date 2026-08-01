import type { ActionDefinition } from "@w6w/types";
import { SplunkClient, unset } from "../lib/client.ts";

interface Input {
  search: string;
  earliestTime?: string;
  latestTime?: string;
  execMode?: string;
}

interface Output {
  sid: string;
}

/**
 * Splunk's search API is job-based, not synchronous: this creates a job and
 * hands back its `sid` immediately — the job keeps running server-side.
 * Poll `search-get` for `dispatchState`/`isDone`, then read `search-get-results`
 * once it is done. Use `search-oneshot` instead when the search is small
 * enough to wait for inline.
 */
const searchCreate: ActionDefinition<Input, Output> = {
  key: "search-create",
  type: "perform",
  resource: "search",
  title: "Create Search Job",
  description:
    "Dispatch a search as an asynchronous job. Returns a `sid` — poll `search-get` for status, then `search-get-results`.",
  idempotent: false,
  params: [
    {
      key: "search",
      label: "Search",
      type: "code",
      required: true,
      placeholder: "search index=_internal | stats count by source",
      hint:
        "Splunk Search Processing Language. Must start with a generating command (`search`, `| tstats`, …).",
    },
    {
      key: "earliestTime",
      label: "Earliest time",
      type: "string",
      row: "time",
      placeholder: "-24h",
      hint: "Splunk relative or absolute time, e.g. `-24h`, `2026-01-01T00:00:00`.",
    },
    {
      key: "latestTime",
      label: "Latest time",
      type: "string",
      row: "time",
      placeholder: "now",
    },
    {
      key: "execMode",
      label: "Exec mode",
      type: "select",
      default: "normal",
      advanced: true,
      options: [
        { value: "normal", label: "Normal (return immediately)" },
        { value: "blocking", label: "Blocking (wait until done)" },
      ],
      hint: "Use `search-oneshot` for a search you want results from inline, without a job at all.",
    },
  ],
  output: [{ key: "sid", type: "string", label: "Search job ID" }],

  execute(input, ctx) {
    return new SplunkClient(ctx).request<Output>("/services/search/jobs", {
      method: "POST",
      form: {
        search: input.search,
        earliest_time: unset(input.earliestTime),
        latest_time: unset(input.latestTime),
        exec_mode: input.execMode ?? "normal",
      },
    });
  },
};

export default searchCreate;
