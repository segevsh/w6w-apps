import type { ActionDefinition } from "@w6w/types";
import { COMPANY, feedParams, feedRecords } from "../lib/records.ts";

type Input = Record<string, unknown>;

const companyFeed: ActionDefinition<Input> = {
  key: "company-feed",
  type: "read",
  resource: "company",
  title: "Companies Feed",
  description:
    "Page through changes to your companies with a cursor. Pass the previous result's cursor to continue.",
  params: feedParams(),
  output: [
    { key: "items", type: "array", label: "Companies" },
    { key: "count", type: "number", label: "Records returned" },
    { key: "availableCount", type: "number", label: "Total matching" },
    { key: "cursor", type: "string", label: "Cursor for the next call" },
  ],

  execute(input, ctx) {
    return feedRecords(ctx, COMPANY, input);
  },
};

export default companyFeed;
