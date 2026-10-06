import type { ActionDefinition } from "@w6w/types";
import { parseJson } from "../lib/client.ts";
import {
  commonParams,
  JOB_OUTPUT,
  shapeJob,
  startUniversalAsync,
  WEBHOOK_PARAM,
} from "../lib/universal.ts";

/**
 * `POST /v3/universal-ai/async` - any asynchronous expert model.
 *
 * The generic form of the "start" actions: crawling, batch scraping, deep research, table
 * extraction, video deepfake detection and the rest. Read the result with Get Async Job.
 */
interface Input {
  feature: string;
  subfeature: string;
  input: unknown;
  provider: string;
  fallbacks?: string;
  providerParams?: unknown;
  webhookReceiver?: string;
}

const asyncJobStart: ActionDefinition<Input> = {
  key: "async-job-start",
  type: "perform",
  resource: "async-job",
  title: "Start Async Job (Universal AI)",
  description:
    "Start any long-running expert-model job by name, for example web/crawl_async or ocr/ocr_tables_async. Read the result with Get Async Job.",
  idempotent: false,
  params: [
    { key: "feature", label: "Feature", type: "string", required: true, hint: "e.g. web" },
    {
      key: "subfeature",
      label: "Subfeature",
      type: "string",
      required: true,
      hint: "e.g. crawl_async",
    },
    {
      key: "input",
      label: "Input",
      type: "json",
      required: true,
      hint: 'The feature\'s own fields, e.g. {"url": "https://example.com"}.',
    },
    ...commonParams("", "The provider id, as listed by Get Feature Info.").map((p) =>
      p.key === "provider" ? { ...p, default: undefined } : p
    ),
    WEBHOOK_PARAM,
  ],
  output: JOB_OUTPUT,
  async execute(input, ctx) {
    const body = parseJson<Record<string, unknown>>(input.input, "Input");
    if (!body || typeof body !== "object") throw new Error("Input must be a JSON object");
    const res = await startUniversalAsync(ctx, {
      feature: input.feature,
      subfeature: input.subfeature,
      provider: input.provider,
      fallbacks: input.fallbacks,
      providerParams: input.providerParams,
      webhookReceiver: input.webhookReceiver,
      input: body,
    });
    return shapeJob(res);
  },
};

export default asyncJobStart;
