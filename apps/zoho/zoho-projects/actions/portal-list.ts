import type { ActionDefinition } from "@w6w/types";
import { listResult, ProjectsClient } from "../lib/client.ts";

type Input = Record<string, never>;

const portalList: ActionDefinition<Input> = {
  key: "portal-list",
  type: "read",
  resource: "portal",
  title: "List Portals",
  description:
    "List the portals (organisations) the connected user can access. Portal IDs feed every other action.",
  params: [],
  output: [
    { key: "items", type: "array", label: "Records" },
    { key: "hasNext", type: "boolean", label: "More pages available" },
    { key: "page", type: "number", label: "Page number returned" },
  ],

  async execute(_input, ctx) {
    const client = new ProjectsClient(ctx);
    return listResult(await client.get("/portals"), "portals");
  },
};

export default portalList;
