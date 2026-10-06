import type { ActionDefinition } from "@w6w/types";
import { RefinerClient } from "../lib/client.ts";

const projectGet: ActionDefinition<Record<string, never>> = {
  key: "project-get",
  type: "read",
  resource: "account",
  title: "Get Environment",
  description:
    "Return the Refiner environment (project) this API key belongs to — a quick way to confirm " +
    "which of Production, Testing, … a connection points at.",
  params: [],
  output: [
    { key: "project_uuid", type: "string", label: "Environment UUID" },
    { key: "project_name", type: "string", label: "Environment name" },
    { key: "message", type: "string", label: "Vendor message" },
  ],

  async execute(_input, ctx) {
    return await new RefinerClient(ctx).json("/");
  },
};

export default projectGet;
