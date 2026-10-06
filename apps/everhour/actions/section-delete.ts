import type { ActionDefinition } from "@w6w/types";
import { encodeId, EverhourClient } from "../lib/client.ts";

/**
 * `DELETE /sections/{sectionId}` — Delete a section.
 *
 * Verified against the Everhour API Blueprint (`everhour.apib`, fetched 2026-10-06).
 */
interface Input {
  sectionId: number;
}

const sectionDelete: ActionDefinition<Input> = {
  key: "section-delete",
  type: "perform",
  resource: "section",
  title: "Delete Section",
  description: "Delete a section.",
  idempotent: true,
  params: [
    {
      key: "sectionId",
      label: "Section ID",
      type: "number",
      required: true,
      hint: "Numeric section id.",
    },
  ],
  output: [
    { key: "ok", type: "boolean", label: "True when the delete succeeded" },
  ],

  execute(input, ctx) {
    return new EverhourClient(ctx).one(`/sections/${encodeId(input.sectionId)}`, {
      method: "DELETE",
    });
  },
};

export default sectionDelete;
