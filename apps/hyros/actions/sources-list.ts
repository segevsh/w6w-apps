import type { ActionDefinition } from "@w6w/types";
import { csv, HyrosClient, pageQuery } from "../lib/client.ts";

interface Input {
  adSourceIds?: string;
  includeOrganic?: boolean;
  includeDisregarded?: boolean;
  integrationType?: string;
  pageSize?: number;
  pageId?: string;
}

export const INTEGRATION_TYPES = [
  "FACEBOOK",
  "GOOGLE",
  "TIKTOK",
  "SNAPCHAT",
  "LINKEDIN",
  "TWITTER",
  "PINTEREST",
  "BING",
];

const sourcesList: ActionDefinition<Input> = {
  key: "sources-list",
  type: "read",
  resource: "source",
  title: "List Sources",
  description: "List traffic sources (tracked ad sources and organic sources) with their tags.",
  params: [
    {
      key: "adSourceIds",
      label: "Ad source IDs",
      type: "string",
      hint: "Comma-separated platform ad-set / campaign ids to restrict to.",
    },
    { key: "includeOrganic", label: "Include organic", type: "boolean" },
    { key: "includeDisregarded", label: "Include disregarded", type: "boolean" },
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
    { key: "result", type: "array", label: "Sources" },
    { key: "nextPageId", type: "string", label: "Cursor for the next page, or null" },
  ],

  async execute(input, ctx) {
    const { result, nextPageId } = await new HyrosClient(ctx).read("/sources", {
      adSourceIds: csv(input.adSourceIds).map((s) => `"${s}"`).join(",") || undefined,
      includeOrganic: input.includeOrganic,
      includeDisregarded: input.includeDisregarded,
      integrationType: input.integrationType,
      ...pageQuery(input),
    });
    return { result, nextPageId };
  },
};

export default sourcesList;
