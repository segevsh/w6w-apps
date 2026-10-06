import type { ActionDefinition } from "@w6w/types";
import { OnePageClient } from "../lib/client.ts";

/** `GET /pipelines` — The account's deal pipelines, each with its ordered stages; use the pipeline id and a stage number on deals. */
const listPipelines: ActionDefinition<Record<string, never>> = {
  key: "list-pipelines",
  type: "read",
  resource: "pipeline",
  title: "List Pipelines",
  description:
    "The account's deal pipelines, each with its ordered stages; use the pipeline id and a stage number on deals.",
  params: [],
  output: [{ key: "pipelines", type: "array", label: "Pipelines ({pipeline})" }],

  async execute(_input, ctx) {
    const data = await new OnePageClient(ctx).data("/pipelines");
    const d = (data ?? {}) as { pipelines?: unknown[] };
    return { pipelines: Array.isArray(d.pipelines) ? d.pipelines : [] };
  },
};

export default listPipelines;
