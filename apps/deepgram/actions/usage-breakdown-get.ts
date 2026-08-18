import type { ActionDefinition } from "@w6w/types";
import { DeepgramClient, isoDate, query } from "../lib/client.ts";

/**
 * `GET /v1/projects/{id}/usage/breakdown` — the same spend, grouped.
 *
 * `usage-get` says how much; this says **where it went**. Grouping by model
 * answers "is the expensive model earning its cost", by tag answers "which
 * workflow", by endpoint answers "is this transcription or speech".
 *
 * That distinction is the whole reason both exist: a total that has doubled is
 * a fact, and a total that has doubled *because one tag tripled* is something
 * you can act on this afternoon.
 *
 * Deepgram's own accessor grouping is worth knowing about too — it splits by
 * API key, which finds the integration nobody remembers deploying.
 */
const action: ActionDefinition = {
  key: "usage-breakdown-get",
  type: "read",
  resource: "usage",
  title: "Get a usage breakdown",
  description:
    "Spend grouped by model, tag, endpoint or API key. A total that doubled is a fact; a total " +
    "that doubled because one tag tripled is something you can act on.",
  params: [
    { key: "start", label: "From", type: "datetime", default: "" },
    { key: "end", label: "To", type: "datetime", default: "" },
    {
      key: "grouping",
      label: "Group By",
      type: "select",
      default: "model",
      options: [
        { value: "model", label: "Model — is the expensive one earning its cost" },
        { value: "tag", label: "Tag — which workflow" },
        { value: "endpoint", label: "Endpoint — transcription, analysis or speech" },
        { value: "accessor", label: "API key — finds the integration nobody remembers" },
        { value: "deployment", label: "Deployment" },
      ],
    },
    { key: "tag", label: "Tag", type: "string", default: "", advanced: true },
  ],
  output: [
    { key: "results", type: "array", label: "Usage, grouped" },
    { key: "resolution", type: "object", label: "The range Deepgram reported on" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const client = new DeepgramClient(ctx);

    return await client.request(
      `/v1/projects/${encodeURIComponent(client.projectId)}/usage/breakdown`,
      {
        query: query({
          start: isoDate(p.start, "start"),
          end: isoDate(p.end, "end"),
          grouping: p.grouping === undefined ? "model" : String(p.grouping),
          tag: p.tag,
        }),
      },
    );
  },
};

export default action;
