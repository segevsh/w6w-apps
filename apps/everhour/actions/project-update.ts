import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, EverhourClient, toNumberList } from "../lib/client.ts";

/**
 * `PUT /projects/{projectId}` — Update a project's name, type or assigned users.
 *
 * Verified against the Everhour API Blueprint (`everhour.apib`, fetched 2026-10-06).
 */
interface Input {
  projectId: string;
  name: string;
  type: string;
  users?: number[] | string;
}

const projectUpdate: ActionDefinition<Input> = {
  key: "project-update",
  type: "perform",
  resource: "project",
  title: "Update Project",
  description: "Update a project's name, type or assigned users.",
  idempotent: true,
  params: [
    {
      key: "projectId",
      label: "Project ID",
      type: "string",
      required: true,
      hint:
        "Everhour project id: `ev:1234567890` for a native project, or `{platform}:{id}` such as `as:123456` for an integration project.",
    },
    { key: "name", label: "Name", type: "string", required: true },
    {
      key: "type",
      label: "Type",
      type: "select",
      required: true,
      options: [{ value: "board", label: "board" }, { value: "list", label: "list" }],
    },
    { key: "users", label: "User IDs", type: "string" },
  ],
  output: [
    { key: "id", type: "string", label: "Project ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "billing", type: "object", label: "Billing" },
    { key: "budget", type: "object", label: "Budget" },
  ],

  execute(input, ctx) {
    return new EverhourClient(ctx).one(`/projects/${encodeId(input.projectId)}`, {
      method: "PUT",
      body: compact({ name: input.name, type: input.type, users: toNumberList(input.users) }),
    });
  },
};

export default projectUpdate;
