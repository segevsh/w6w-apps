import type { ActionDefinition } from "@w6w/types";
import { BrowserlessClient, readBody } from "../lib/client.ts";
import { asObject, buildQuery, type QueryInput, queryParams } from "../lib/params.ts";

interface Input extends QueryInput {
  code: string;
  context?: Record<string, unknown> | string;
}

/**
 * `POST /function` runs an ES-module you supply inside the browser. The module
 * must `export default async ({ page, context }) => ({ data, type })`. The vendor
 * answers with `data` served under the content type named by `type`; this action
 * returns it parsed when JSON, as text when text-like, else as base64.
 */
const fn: ActionDefinition<Input> = {
  key: "function",
  type: "perform",
  idempotent: false,
  resource: "page",
  title: "Run Function",
  description:
    "Run your own Puppeteer JavaScript in a Browserless browser and return what it produces.",
  params: [
    {
      key: "code",
      label: "Code (ES module)",
      type: "text",
      required: true,
      hint:
        "Must `export default async ({ page, context }) => ({ data, type })`, where `type` is " +
        'the content type of `data`, e.g. "application/json" or "text/plain".',
      placeholder:
        'export default async ({ page, context }) => {\n  await page.goto(context.url);\n  return { data: { title: await page.title() }, type: "application/json" };\n};',
    },
    {
      key: "context",
      label: "Context (JSON)",
      type: "json",
      hint: "An object handed to your code as `context`.",
    },
    ...queryParams,
  ],
  output: [
    { key: "contentType", type: "string", label: "Content type your code returned" },
    { key: "sizeBytes", type: "number", label: "Size in bytes" },
    { key: "data", type: "object", label: "Parsed result (JSON responses)" },
    { key: "text", type: "string", label: "Result text (text responses)" },
    { key: "base64", type: "string", label: "Result bytes (binary responses)" },
  ],

  async execute(input, ctx) {
    if (!input.code || !input.code.trim()) throw new Error("Code is required");
    const context = asObject(input.context, "Context");
    const res = await new BrowserlessClient(ctx).response("/function", {
      method: "POST",
      query: buildQuery(input),
      body: { code: input.code, ...(context ? { context } : {}) },
    });
    return await readBody(res);
  },
};

export default fn;
