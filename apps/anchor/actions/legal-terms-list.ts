import type { ActionDefinition } from "@w6w/types";
import { AnchorClient } from "../lib/client.ts";
import { limitParam, pageParam } from "../lib/params.ts";

/** `GET /legal-terms` — Anchor operation `listLegalTerms`. */
interface Input {
  page?: number;
  limit?: number;
  isDetailed?: boolean;
}

const legalTermsList: ActionDefinition<Input> = {
  key: "legal-terms-list",
  type: "search",
  resource: "legal-terms",
  title: "List Legal Terms",
  description: "Page through your legal-terms documents (terms of service, privacy policy, MSA).",
  params: [
    pageParam,
    limitParam,
    {
      key: "isDetailed",
      label: "Include content",
      type: "boolean",
      hint: "Include rich-text content in each entry.",
    },
  ],
  output: [
    { key: "entries", type: "array", label: "Items on this page" },
    { key: "page", type: "number", label: "Page" },
    { key: "limit", type: "number", label: "Page size" },
    { key: "totalCount", type: "number", label: "Total matching items" },
  ],

  execute(input, ctx) {
    return new AnchorClient(ctx).request("GET", "/legal-terms", {
      query: { page: input.page, limit: input.limit, isDetailed: input.isDetailed },
    });
  },
};

export default legalTermsList;
