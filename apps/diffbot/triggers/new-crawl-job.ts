import type { ActionDefinition, TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import crawlGet from "../actions/crawl-get.ts";

/**
 * Wraps `crawl-get` with no `name` (`GET /v3/crawl`), which lists every crawl and bulk job on the
 * token (https://docs.diffbot.com/reference/ — Crawl: with no name, GET /v3/crawl lists the token's jobs). A token's job list is a small bounded
 * collection; the kit refuses more than 5000 rows.
 */
const trigger: TriggerDefinition = {
  key: "new-crawl-job",
  title: "New Crawl or Bulk Job",
  description: "The run gets each crawl or bulk job newly created on the Diffbot token.",
  params: [],
  output: [
    { key: "name", type: "string", label: "Job name" },
    { key: "type", type: "string", label: "Job type" },
    { key: "statusCode", type: "number", label: "Status code" },
    { key: "statusMessage", type: "string", label: "Status message" },
  ],
  sample: { name: "my-crawl", type: "crawl", statusCode: 1, statusMessage: "Job is in progress." },
  minIntervalMs: 300_000,
  async poll({ state }, ctx) {
    const result = await (crawlGet as ActionDefinition).execute({}, ctx) as {
      jobs?: Array<Record<string, unknown>>;
    };
    const { events, nextState } = await pollSnapshot({
      state,
      rows: (result.jobs ?? []).map((job) => ({
        key: String(job.name ?? ""),
        values: { name: job.name, type: job.type },
      })),
      emit: { added: true, updated: false },
    });
    const byName = new Map((result.jobs ?? []).map((job) => [String(job.name ?? ""), job]));
    return { events: events.map((change) => byName.get(change.key) ?? change.values), nextState };
  },
};

export default trigger;
