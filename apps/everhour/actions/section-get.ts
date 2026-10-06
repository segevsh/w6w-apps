import type { ActionDefinition } from "@w6w/types";
import { encodeId, EverhourClient } from "../lib/client.ts";

/**
 * `GET /sections/{sectionId}` — Fetch one section.
 *
 * Verified against the Everhour API Blueprint (`everhour.apib`, fetched 2026-10-06).
 */
interface Input {
  sectionId: number;
}

const sectionGet: ActionDefinition<Input> = {
  key: "section-get",
  type: "read",
  resource: "section",
  title: "Get Section",
  description: "Fetch one section.",
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
    { key: "id", type: "number", label: "Section ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "project", type: "string", label: "Project ID" },
  ],

  execute(input, ctx) {
    return new EverhourClient(ctx).one(`/sections/${encodeId(input.sectionId)}`);
  },
};

export default sectionGet;
