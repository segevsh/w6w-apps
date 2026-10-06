import type { ActionDefinition } from "@w6w/types";
import { getManyParams, getManyRecords, PROJECT } from "../lib/records.ts";

type Input = Record<string, unknown>;

const projectGetMany: ActionDefinition<Input> = {
  key: "project-get-many",
  type: "read",
  resource: "project",
  title: "Get Multiple Projects",
  description: "Fetch several projects by ID in one call.",
  params: getManyParams(PROJECT),
  output: [
    { key: "items", type: "array", label: "Projects" },
    { key: "count", type: "number", label: "Records returned" },
  ],

  execute(input, ctx) {
    return getManyRecords(ctx, PROJECT, input);
  },
};

export default projectGetMany;
