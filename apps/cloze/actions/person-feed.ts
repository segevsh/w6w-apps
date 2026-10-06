import type { ActionDefinition } from "@w6w/types";
import { feedParams, feedRecords, PERSON } from "../lib/records.ts";

type Input = Record<string, unknown>;

const personFeed: ActionDefinition<Input> = {
  key: "person-feed",
  type: "read",
  resource: "person",
  title: "People Feed",
  description:
    "Page through changes to your people with a cursor. Pass the previous result's cursor to continue.",
  params: feedParams(),
  output: [
    { key: "items", type: "array", label: "People" },
    { key: "count", type: "number", label: "Records returned" },
    { key: "availableCount", type: "number", label: "Total matching" },
    { key: "cursor", type: "string", label: "Cursor for the next call" },
  ],

  execute(input, ctx) {
    return feedRecords(ctx, PERSON, input);
  },
};

export default personFeed;
