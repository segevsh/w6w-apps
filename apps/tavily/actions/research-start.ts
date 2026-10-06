import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, TavilyClient, toList } from "../lib/client.ts";

/**
 * `POST /research` — queue an asynchronous research task (HTTP 201, `status:
 * pending`). Poll `research-get` with the returned `request_id`.
 *
 * `stream` is deliberately not exposed: it switches the response to an SSE
 * stream, which a request/response action cannot return.
 *
 * Not idempotent: the endpoint takes no idempotency key, so every call queues
 * and bills a new task.
 */
interface Input {
  input: string;
  model?: string;
  outputSchema?: unknown;
  citationFormat?: string;
  outputLength?: string;
  includeDomains?: string;
  excludeDomains?: string;
}

const researchStart: ActionDefinition<Input> = {
  key: "research-start",
  type: "perform",
  resource: "research",
  title: "Start Research Task",
  description:
    "Queue a multi-step research task that produces a cited report. Poll Get Research Task for the result.",
  idempotent: false,
  params: [
    { key: "input", label: "Research question", type: "text", required: true },
    {
      key: "model",
      label: "Model",
      type: "select",
      default: "auto",
      options: [
        { value: "auto", label: "Auto" },
        { value: "mini", label: "Mini (narrow, efficient)" },
        { value: "pro", label: "Pro (comprehensive, multi-angle)" },
      ],
    },
    {
      key: "outputSchema",
      label: "Output schema",
      type: "json",
      hint: "Optional JSON Schema object with a `properties` field to structure the report.",
    },
    {
      key: "citationFormat",
      label: "Citation format",
      type: "select",
      default: "numbered",
      options: [
        { value: "numbered", label: "Numbered" },
        { value: "mla", label: "MLA" },
        { value: "apa", label: "APA" },
        { value: "chicago", label: "Chicago" },
      ],
    },
    {
      key: "outputLength",
      label: "Output length",
      type: "select",
      default: "standard",
      options: [
        { value: "short", label: "Short" },
        { value: "standard", label: "Standard" },
        { value: "long", label: "Long" },
      ],
    },
    {
      key: "includeDomains",
      label: "Preferred domains",
      type: "text",
      hint: "Soft preference, comma or newline separated. At most 20.",
    },
    {
      key: "excludeDomains",
      label: "Excluded domains",
      type: "text",
      hint: "Hard blocklist including subdomains, comma or newline separated. At most 20.",
    },
  ],
  output: [
    { key: "request_id", type: "string", label: "Request ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "created_at", type: "string", label: "Created at" },
    { key: "model", type: "string", label: "Model" },
  ],

  execute(input, ctx) {
    return new TavilyClient(ctx).post("/research", {
      input: input.input,
      model: input.model,
      output_schema: asOptionalJson(input.outputSchema, "outputSchema"),
      citation_format: input.citationFormat,
      output_length: input.outputLength,
      include_domains: toList(input.includeDomains),
      exclude_domains: toList(input.excludeDomains),
    });
  },
};

export default researchStart;
