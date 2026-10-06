import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, EverhourClient } from "../lib/client.ts";

/**
 * `PUT /sections/{sectionId}` — Update a section.
 *
 * Verified against the Everhour API Blueprint (`everhour.apib`, fetched 2026-10-06).
 */
interface Input {
  sectionId: number;
  name: string;
  position?: number;
  status?: string;
}

const sectionUpdate: ActionDefinition<Input> = {
  key: "section-update",
  type: "perform",
  resource: "section",
  title: "Update Section",
  description: "Update a section.",
  idempotent: true,
  params: [
    {
      key: "sectionId",
      label: "Section ID",
      type: "number",
      required: true,
      hint: "Numeric section id.",
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
    return new EverhourClient(ctx).one(`/sections/${encodeId(input.sectionId)}`, {
      method: "PUT",
      body: compact({ name: input.name, position: input.position, status: input.status }),
    });
  },
};

export default sectionUpdate;
