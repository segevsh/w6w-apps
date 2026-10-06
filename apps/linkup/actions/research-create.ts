import type { ActionDefinition } from "@w6w/types";
import { compact, LinkupClient } from "../lib/client.ts";
import {
  DATE_PARAMS,
  dateOnly,
  DOMAIN_PARAMS,
  list,
  required,
  schemaString,
} from "../lib/params.ts";

interface Input {
  q: string;
  outputType: string;
  structuredOutputSchema?: unknown;
  mode?: string;
  reasoningDepth?: string;
  fromDate?: string;
  toDate?: string;
  includeDomains?: string[] | string;
  excludeDomains?: string[] | string;
}

const researchCreate: ActionDefinition<Input, Record<string, unknown>> = {
  key: "research-create",
  type: "perform",
  idempotent: false,
  resource: "research",
  title: "Create Research Task",
  description:
    "Start an asynchronous research agent that navigates the web to produce a sourced answer or " +
    "structured JSON (typically 2 to 20 minutes). Poll with Get Research Task.",
  params: [
    { key: "q", label: "Question", type: "text", required: true },
    {
      key: "outputType",
      label: "Output type",
      type: "select",
      required: true,
      default: "sourcedAnswer",
      options: [
        { value: "sourcedAnswer", label: "Sourced answer" },
        { value: "structured", label: "Structured JSON" },
      ],
    },
    {
      key: "structuredOutputSchema",
      label: "Output schema (JSON Schema)",
      type: "json",
      hint: "Required when the output type is structured.",
    },
    {
      key: "mode",
      label: "Mode",
      type: "select",
      options: ["auto", "answer", "investigate", "research"].map((v) => ({ value: v, label: v })),
      hint: "Omit to let the agent classify the question (auto).",
    },
    {
      key: "reasoningDepth",
      label: "Reasoning depth",
      type: "select",
      options: ["S", "M", "L", "XL"].map((v) => ({ value: v, label: v })),
      hint: "S < M < L < XL. Default L. Higher trades latency for thoroughness.",
    },
    ...DATE_PARAMS,
    ...DOMAIN_PARAMS,
  ],
  output: [
    { key: "id", type: "string", label: "Task id" },
    { key: "status", type: "string", label: "pending, processing, completed or failed" },
    { key: "task", type: "object", label: "The task as returned by Linkup" },
  ],

  async execute(input, ctx) {
    if (!["sourcedAnswer", "structured"].includes(input.outputType)) {
      throw new Error("outputType must be sourcedAnswer or structured");
    }
    const schema = schemaString(input.structuredOutputSchema, "Output schema");
    if (input.outputType === "structured" && !schema) {
      throw new Error("Output schema is required when the output type is structured");
    }
    const task = await new LinkupClient(ctx).post<Record<string, unknown>>(
      "/v1/research",
      compact({
        q: required(input.q, "Question"),
        outputType: input.outputType,
        structuredOutputSchema: input.outputType === "structured" ? schema : undefined,
        mode: input.mode,
        reasoningDepth: input.reasoningDepth,
        fromDate: dateOnly(input.fromDate, "From date"),
        toDate: dateOnly(input.toDate, "To date"),
        includeDomains: list(input.includeDomains),
        excludeDomains: list(input.excludeDomains),
      }),
    );
    return { id: task?.id, status: task?.status, task };
  },
};

export default researchCreate;
