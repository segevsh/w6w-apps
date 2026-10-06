import type { ActionDefinition } from "@w6w/types";
import { compact, EverhourClient, toNumberList } from "../lib/client.ts";

/**
 * `POST /projects` — Create an Everhour project.
 *
 * Verified against the Everhour API Blueprint (`everhour.apib`, fetched 2026-10-06).
 */
interface Input {
  name: string;
  type: string;
  users?: number[] | string;
}

const projectCreate: ActionDefinition<Input> = {
  key: "project-create",
  type: "perform",
  resource: "project",
  title: "Create Project",
  description: "Create an Everhour project.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    {
      key: "type",
      label: "Type",
      type: "select",
      required: true,
      options: [{ value: "board", label: "board" }, { value: "list", label: "list" }],
      hint: "`board` or to-do `list`.",
    },
    {
      key: "users",
      label: "User IDs",
      type: "string",
      hint: "Comma-separated ids of users to assign.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Project ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "billing", type: "object", label: "Billing" },
    { key: "budget", type: "object", label: "Budget" },
  ],

  execute(input, ctx) {
    return new EverhourClient(ctx).one(`/projects`, {
      method: "POST",
      body: compact({ name: input.name, type: input.type, users: toNumberList(input.users) }),
    });
  },
};

export default projectCreate;
