import type { ActionDefinition } from "@w6w/types";
import { dataOf, WizaClient } from "../lib/client.ts";

interface Input {
  id: string | number;
}

export const LIST_OUTPUT = [
  { key: "id", type: "number" as const, label: "List ID" },
  { key: "name", type: "string" as const, label: "List name" },
  {
    key: "status",
    type: "string" as const,
    label: "List status; a list can fail on LinkedIn rate limiting",
  },
  { key: "stats", type: "object" as const, label: "people count and credits used" },
  { key: "finished_at", type: "string" as const, label: "When it finished, or null" },
  { key: "created_at", type: "string" as const, label: "When it was created" },
  { key: "enrichment_level", type: "string" as const, label: "none | partial | full" },
];

const getList: ActionDefinition<Input> = {
  key: "get-list",
  type: "read",
  resource: "list",
  title: "Get List",
  description:
    "Read a list's status, stats and credits by id (GET /api/lists/{id}). Poll it after Create List or Create Prospect List, then read the contacts. Check `status`: a list can fail (LinkedIn rate limiting). An unknown id is HTTP 404 and fails the action.",
  params: [{ key: "id", label: "List ID", type: "string", required: true }],
  output: LIST_OUTPUT,

  async execute(input, ctx) {
    const id = String(input.id ?? "").trim();
    if (!/^\d+$/.test(id)) throw new Error("id must be the numeric list id");
    const body = await new WizaClient(ctx).call(`/api/lists/${id}`);
    return dataOf(body);
  },
};

export default getList;
