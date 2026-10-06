import type { ActionDefinition } from "@w6w/types";
import { findParams, findRecords, PROJECT } from "../lib/records.ts";

type Input = Record<string, unknown>;

const projectFind: ActionDefinition<Input> = {
  key: "project-find",
  type: "search",
  resource: "project",
  title: "Find Projects",
  description:
    "Search your projects with Cloze's query syntax or structured filters, one page at a time.",
  params: [...findParams(PROJECT)],
  output: [
    { key: "items", type: "array", label: "Projects" },
    { key: "count", type: "number", label: "Records on this page" },
    { key: "availableCount", type: "number", label: "Total matching" },
    { key: "pageNumber", type: "number", label: "Page number" },
    { key: "pageSize", type: "number", label: "Page size" },
  ],

  execute(input, ctx) {
    return findRecords(ctx, PROJECT, input, ["hidelostdone", "collaborator"]);
  },
};

export default projectFind;
