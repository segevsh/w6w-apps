import type { ActionDefinition } from "@w6w/types";
import { csv, HyrosClient, pageQuery } from "../lib/client.ts";
import { INTEGRATION_TYPES } from "./sources-list.ts";

interface Input {
  adSourceIds?: string;
  integrationType?: string;
  pageSize?: number;
  pageId?: string;
}

const adsList: ActionDefinition<Input> = {
  key: "ads-list",
  type: "read",
  resource: "ad",
  title: "List Ads",
  description: "List the ads Hyros tracks, optionally for given ad sources or one platform.",
  params: [
    {
      key: "adSourceIds",
      label: "Ad source IDs",
      type: "string",
      hint: "Comma-separated platform ad-set / campaign ids.",
    },
    {
      key: "integrationType",
      label: "Platform",
      type: "select",
      options: INTEGRATION_TYPES.map((v) => ({ value: v, label: v })),
    },
    {
      key: "pageSize",
      label: "Page size",
      type: "number",
      default: 50,
      validation: { min: 1, max: 250, integer: true },
    },
    {
      key: "pageId",
      label: "Page cursor",
      type: "string",
      hint: "The nextPageId from the last page.",
    },
  ],
  output: [
    { key: "result", type: "array", label: "Ads" },
    { key: "nextPageId", type: "string", label: "Cursor for the next page, or null" },
  ],

  async execute(input, ctx) {
    const { result, nextPageId } = await new HyrosClient(ctx).read("/ads", {
      adSourceIds: csv(input.adSourceIds).map((s) => `"${s}"`).join(",") || undefined,
      integrationType: input.integrationType,
      ...pageQuery(input),
    });
    return { result, nextPageId };
  },
};

export default adsList;
