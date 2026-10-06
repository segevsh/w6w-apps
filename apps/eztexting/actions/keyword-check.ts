import type { ActionDefinition } from "@w6w/types";
import { encodePathSegment, EzTextingClient } from "../lib/client.ts";

/** `GET /v1/keywords/{keyword}/check` — `{keyword, available}`. Read-only; buying is not covered. */
interface Input {
  keyword: string;
}

const keywordCheck: ActionDefinition<Input> = {
  key: "keyword-check",
  type: "read",
  resource: "keyword",
  title: "Check Keyword Availability",
  description: "Check whether a keyword is available to purchase.",
  params: [{ key: "keyword", label: "Keyword", type: "string", required: true }],
  output: [
    { key: "keyword", type: "string", label: "Keyword" },
    { key: "available", type: "boolean", label: "Available" },
  ],

  async execute(input, ctx) {
    return (await new EzTextingClient(ctx).json(
      `/keywords/${encodePathSegment(input.keyword)}/check`,
    )) ?? {};
  },
};

export default keywordCheck;
