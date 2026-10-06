import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, EverhourClient } from "../lib/client.ts";

/**
 * `PATCH /projects/{projectId}/archive` — Archive or unarchive a project.
 *
 * Verified against the Everhour API Blueprint (`everhour.apib`, fetched 2026-10-06).
 */
interface Input {
  projectId: string;
  archived: boolean;
}

const projectArchive: ActionDefinition<Input> = {
  key: "project-archive",
  type: "perform",
  resource: "project",
  title: "Archive Project",
  description: "Archive or unarchive a project.",
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
    {
      key: "archived",
      label: "Archived",
      type: "boolean",
      required: true,
      hint: "True archives the project, false restores it.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Project ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "billing", type: "object", label: "Billing" },
    { key: "budget", type: "object", label: "Budget" },
  ],

  execute(input, ctx) {
    return new EverhourClient(ctx).one(`/projects/${encodeId(input.projectId)}/archive`, {
      method: "PATCH",
      body: compact({ archived: input.archived }),
    });
  },
};

export default projectArchive;
