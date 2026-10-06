import type { ActionDefinition } from "@w6w/types";
import { DiffbotClient } from "../lib/client.ts";
import { shapeJob } from "../lib/crawl.ts";
import type { CrawlJob } from "../lib/crawl.ts";

interface Input {
  name: string;
  operation: string;
}

/** Operation → the query the vendor documents on `GET /v3/crawl`. */
const OPERATIONS: Record<string, Record<string, string>> = {
  pause: { pause: "1" },
  resume: { pause: "0" },
  "start-round": { roundStart: "1" },
  restart: { restart: "1" },
};

/**
 * `GET /v3/crawl?name=…&pause=1|0 | roundStart=1 | restart=1`. Delete is its own
 * action: it is irreversible and should not sit one dropdown away from Pause.
 */
const crawlUpdate: ActionDefinition<Input> = {
  key: "crawl-update",
  type: "perform",
  resource: "crawl",
  title: "Pause / Resume / Restart Crawl",
  description: "Pause or resume a crawl job, force a new round, or restart it. Restart erases " +
    "everything processed so far and re-processes every seed (and re-bills the pages).",
  idempotent: false,
  params: [
    { key: "name", label: "Job name", type: "string", required: true },
    {
      key: "operation",
      label: "Operation",
      type: "select",
      required: true,
      options: [
        { value: "pause", label: "Pause" },
        { value: "resume", label: "Resume a paused job" },
        { value: "start-round", label: "Start a new round now (manual repeat)" },
        { value: "restart", label: "Restart — erase processed data and start over" },
      ],
    },
  ],
  output: [
    { key: "message", type: "string", label: "Vendor message" },
    { key: "job", type: "object", label: "The job after the change" },
    { key: "statusCode", type: "number", label: "Job status code" },
    { key: "statusMessage", type: "string", label: "Job status message" },
  ],

  async execute(input, ctx) {
    const op = OPERATIONS[input.operation];
    if (!op) throw new Error(`Unknown operation "${input.operation}"`);
    const { body } = await new DiffbotClient(ctx).request("/v3/crawl", {
      query: { name: input.name.trim(), ...op },
    });
    const r = (body ?? {}) as { response?: string; jobs?: CrawlJob[] };
    const job = shapeJob(
      (r.jobs ?? []).find((j) => j.name === input.name.trim()) ?? r.jobs?.[0] ?? {},
    );
    return {
      message: r.response,
      job,
      statusCode: job.statusCode,
      statusMessage: job.statusMessage,
    };
  },
};

export default crawlUpdate;
