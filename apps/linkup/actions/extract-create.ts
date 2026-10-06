import type { ActionDefinition } from "@w6w/types";
import { compact, LinkupClient } from "../lib/client.ts";
import { required, schemaObject } from "../lib/params.ts";

interface Input {
  q: string;
  url: string;
  schema?: unknown;
  verifyUrls?: boolean;
}

const extractCreate: ActionDefinition<Input, Record<string, unknown>> = {
  key: "extract-create",
  type: "perform",
  idempotent: false,
  resource: "extract",
  title: "Create Extract Task (Beta)",
  description:
    "Start an asynchronous Extract task that turns a page into rows of structured data, delivered " +
    "as a downloadable NDJSON file. Closed beta: the organisation must be enabled (403 otherwise). " +
    "Poll with Get Extract Task.",
  params: [
    {
      key: "q",
      label: "What to extract",
      type: "text",
      required: true,
      hint: "Describe the rows you want.",
    },
    { key: "url", label: "Page URL", type: "string", required: true },
    { key: "schema", label: "Row schema (JSON Schema)", type: "json" },
    { key: "verifyUrls", label: "Verify URLs", type: "boolean" },
  ],
  output: [
    { key: "id", type: "string", label: "Task id" },
    { key: "status", type: "string", label: "pending, processing, completed or failed" },
    { key: "task", type: "object", label: "The task as returned by Linkup" },
  ],

  async execute(input, ctx) {
    const task = await new LinkupClient(ctx).post<Record<string, unknown>>(
      "/v1/extract",
      compact({
        q: required(input.q, "What to extract"),
        url: required(input.url, "Page URL"),
        schema: schemaObject(input.schema, "Row schema"),
        verifyUrls: input.verifyUrls ? true : undefined,
      }),
    );
    return { id: task?.id, status: task?.status, task };
  },
};

export default extractCreate;
