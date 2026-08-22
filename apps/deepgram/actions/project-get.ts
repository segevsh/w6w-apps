import type { ActionDefinition } from "@w6w/types";
import { DeepgramClient } from "../lib/client.ts";

/**
 * `GET /v1/projects/{id}` — this connection's project.
 *
 * Small but useful for one thing in particular: the project carries the
 * **company** and the contract shape, which is what decides whether the `quota`
 * health check will find a pre-paid balance or nothing at all. An invoiced
 * enterprise project has no balance to read, and knowing that in advance is the
 * difference between "we are out of credit" and "we do not use credit".
 */
const action: ActionDefinition = {
  key: "project-get",
  type: "read",
  resource: "project",
  title: "Get this project",
  description:
    "The project this connection's key belongs to, including the contract shape that decides " +
    "whether there is a pre-paid balance to read at all.",
  params: [],
  output: [
    { key: "project_id", type: "string", label: "Project ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "company", type: "string", label: "Company" },
  ],

  async execute(_input, ctx) {
    const client = new DeepgramClient(ctx);
    return await client.request(`/v1/projects/${encodeURIComponent(client.projectId)}`);
  },
};

export default action;
