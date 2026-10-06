import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, EverhourClient } from "../lib/client.ts";

/**
 * `POST /projects/{projectId}/sections` — Create a section in a project.
 *
 * Verified against the Everhour API Blueprint (`everhour.apib`, fetched 2026-10-06).
 */
interface Input {
  projectId: string;
  name: string;
  position?: number;
  status?: string;
}

const sectionCreate: ActionDefinition<Input> = {
  key: "section-create",
  type: "perform",
  resource: "section",
  title: "Create Section",
  description: "Create a section in a project.",
  idempotent: false,
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
    { key: "position", label: "Position", type: "number" },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [{ value: "open", label: "open" }, { value: "archived", label: "archived" }],
    },
  ],
  output: [
    { key: "id", type: "number", label: "Section ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "project", type: "string", label: "Project ID" },
  ],

  execute(input, ctx) {
    return new EverhourClient(ctx).one(`/projects/${encodeId(input.projectId)}/sections`, {
      method: "POST",
      body: compact({ name: input.name, position: input.position, status: input.status }),
    });
  },
};

export default sectionCreate;
