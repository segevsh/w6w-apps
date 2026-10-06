import type { ActionDefinition } from "@w6w/types";
import { feedParams, feedRecords, PROJECT } from "../lib/records.ts";

type Input = Record<string, unknown>;

const projectFeed: ActionDefinition<Input> = {
  key: "project-feed",
  type: "read",
  resource: "project",
  title: "Projects Feed",
  description:
    "Page through changes to your projects with a cursor. Pass the previous result's cursor to continue.",
  params: feedParams(),
  output: [
    { key: "items", type: "array", label: "Projects" },
    { key: "count", type: "number", label: "Records returned" },
    { key: "availableCount", type: "number", label: "Total matching" },
    { key: "cursor", type: "string", label: "Cursor for the next call" },
  ],

  execute(input, ctx) {
    return feedRecords(ctx, PROJECT, input);
  },
};

export default projectFeed;
