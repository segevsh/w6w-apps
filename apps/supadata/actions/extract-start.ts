import type { ActionDefinition } from "@w6w/types";
import { compact, requireText, SupadataClient } from "../lib/client.ts";

interface Input {
  url: string;
  prompt?: string;
  schema?: Record<string, unknown> | string;
}

function parseSchema(v: Input["schema"]): Record<string, unknown> | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  if (typeof v === "object") return v;
  try {
    const parsed = JSON.parse(v);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
  } catch { /* fall through */ }
  throw new Error("Schema must be a JSON object");
}

const extractStart: ActionDefinition<Input> = {
  key: "extract-start",
  type: "perform",
  idempotent: false,
  resource: "extract",
  title: "Start Video Extraction",
  description:
    "Use AI to extract structured data from a video (YouTube, TikTok, Instagram, X, Facebook or a " +
    "media file URL). Give a prompt, a JSON Schema, or both. Returns a job id to poll with Get " +
    "Extraction Job. 5 credits per started minute, minimum 5.",
  params: [
    { key: "url", label: "Video URL", type: "string", required: true },
    {
      key: "prompt",
      label: "Prompt",
      type: "text",
      hint: "What to extract. Required unless a schema is given.",
    },
    {
      key: "schema",
      label: "Output JSON Schema",
      type: "json",
      hint: "A JSON Schema the extracted data must match. Required unless a prompt is given.",
    },
  ],
  output: [{ key: "jobId", type: "string", label: "Job id" }],

  async execute(input, ctx) {
    const prompt = input.prompt?.trim();
    const schema = parseSchema(input.schema);
    if (!prompt && !schema) throw new Error("Provide a prompt, a schema, or both");
    return await new SupadataClient(ctx).json("/extract", {
      method: "POST",
      body: compact({ url: requireText(input.url, "Video URL"), prompt, schema }),
    });
  },
};

export default extractStart;
