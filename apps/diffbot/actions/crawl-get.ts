import type { ActionDefinition } from "@w6w/types";
import { compact, DiffbotClient } from "../lib/client.ts";
import { shapeJob } from "../lib/crawl.ts";
import type { CrawlJob } from "../lib/crawl.ts";

interface Input {
  name?: string;
}

/**
 * `GET /v3/crawl` — with no `name`, every active crawl and bulk job on the token
 * (the vendor says the output is identical to the Bulk Job list); with a `name`,
 * that one job. Read-only: the same endpoint also pauses/restarts/deletes, which
 * are separate actions here.
 */
const crawlGet: ActionDefinition<Input> = {
  key: "crawl-get",
  type: "read",
  resource: "crawl",
  title: "Get Crawl Job Status",
  description: "Read one crawl job by name, or list every crawl and bulk job on the token, with " +
    "status, page counts and objects found. Poll this until `finished` is true.",
  params: [
    {
      key: "name",
      label: "Job name",
      type: "string",
      hint: "Leave empty to list every job.",
    },
  ],
  output: [
    { key: "count", type: "number", label: "Jobs returned" },
    { key: "job", type: "object", label: "The first job (null when none)" },
    { key: "jobs", type: "array", label: "Jobs with statusCode, statusMessage and finished" },
    { key: "finished", type: "boolean", label: "The first job will make no more progress alone" },
    { key: "statusCode", type: "number", label: "Status code of the first job" },
    { key: "statusMessage", type: "string", label: "Status message of the first job" },
    { key: "objectsFound", type: "number", label: "Objects extracted so far (first job)" },
  ],

  async execute(input, ctx) {
    const { body } = await new DiffbotClient(ctx).request("/v3/crawl", {
      query: compact({ name: input.name?.trim() }) as Record<string, string>,
    });
    const r = (body ?? {}) as { jobs?: CrawlJob[] };
    const jobs = (Array.isArray(r.jobs) ? r.jobs : []).map(shapeJob);
    const first = jobs[0];
    return {
      count: jobs.length,
      job: first ?? null,
      jobs,
      finished: first?.finished ?? false,
      statusCode: first?.statusCode,
      statusMessage: first?.statusMessage,
      objectsFound: first?.objectsFound,
    };
  },
};

export default crawlGet;
