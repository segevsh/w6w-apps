import type { ActionDefinition } from "@w6w/types";
import { encodeId, EverhourClient } from "../lib/client.ts";

/**
 * `POST /projects/{projectId}/sync` — Import a project that exists in a connected tool (Asana, Trello, ClickUp, ...) into Everhour immediately. Safe to repeat.
 *
 * Verified against the Everhour API Blueprint (`everhour.apib`, fetched 2026-10-06).
 */
interface Input {
  projectId: string;
}

const projectSync: ActionDefinition<Input> = {
  key: "project-sync",
  type: "perform",
  resource: "project",
  title: "Sync Integration Project",
  description:
    "Import a project that exists in a connected tool (Asana, Trello, ClickUp, ...) into Everhour immediately. Safe to repeat.",
  idempotent: true,
  params: [
    {
      key: "projectId",
      label: "External project ID",
      type: "string",
      required: true,
      hint:
        "`{platform code}:{platform id}` such as `as:1234567789001`. Codes: as Asana, b2 Basecamp 2, b3 Basecamp 3/4, bb Bitbucket, cl ClickUp, gh GitHub, gl GitLab, in Insightly, li Linear, mo Monday, no Notion, td Todoist, tw Teamwork, tr Trello, wr Wrike.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Project ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "billing", type: "object", label: "Billing" },
    { key: "budget", type: "object", label: "Budget" },
  ],

  execute(input, ctx) {
    return new EverhourClient(ctx).one(`/projects/${encodeId(input.projectId)}/sync`, {
      method: "POST",
    });
  },
};

export default projectSync;
