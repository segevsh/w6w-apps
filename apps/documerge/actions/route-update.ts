import type { ActionDefinition } from "@w6w/types";
import { asArray, compact, DocuMergeClient } from "../lib/client.ts";

interface Input {
  routeId: number;
  name: string;
  outputName?: string;
  folder?: string;
  timezone?: string;
  addWatermark?: boolean;
  watermarkText?: string;
  rules?: unknown;
}

const routeUpdate: ActionDefinition<Input> = {
  key: "route-update",
  type: "perform",
  resource: "route",
  title: "Update Route",
  description: "Replace a route's settings. The vendor requires the name on every update.",
  idempotent: true,
  params: [
    {
      key: "routeId",
      label: "Route ID",
      type: "number",
      required: true,
      hint: "From List Routes.",
    },
    { key: "name", label: "Name", type: "string", required: true },
    { key: "outputName", label: "Output file name", type: "string" },
    { key: "folder", label: "Folder", type: "string" },
    { key: "timezone", label: "Timezone", type: "string", hint: "e.g. US/Eastern." },
    { key: "addWatermark", label: "Add watermark", type: "boolean" },
    { key: "watermarkText", label: "Watermark text", type: "string" },
    {
      key: "rules",
      label: "Rules",
      type: "json",
      hint: "JSON array of route rules (which documents the route merges, and when).",
    },
  ],
  output: [
    { key: "data", type: "object", label: "The vendor's `data` envelope" },
  ],

  async execute(input, ctx) {
    return await new DocuMergeClient(ctx).json(
      `/api/routes/${encodeURIComponent(String(input.routeId))}`,
      {
        method: "PUT",
        body: compact({
          name: input.name,
          output_name: input.outputName,
          folder: input.folder,
          timezone: input.timezone,
          add_watermark: input.addWatermark,
          watermark_text: input.watermarkText,
          rules: asArray(input.rules, "Rules"),
        }),
      },
    );
  },
};

export default routeUpdate;
