import type { ActionDefinition } from "@w6w/types";
import {
  type Input,
  noteIdParam,
  projectIdParam,
  screenIdParam,
  screenPath,
} from "../lib/actions.ts";
import { pathId, ZeplinClient } from "../lib/client.ts";
import { colorParam, coord, NOTE_COLORS } from "./create-screen-note.ts";

const updateScreenNote: ActionDefinition<Input> = {
  key: "update-screen-note",
  type: "perform",
  resource: "note",
  title: "Update Screen Note",
  description:
    "Resolve or reopen a note, recolor it or move it (PATCH /v1/projects/{project_id}/screens/{screen_id}/notes/{note_id}). Only the fields you set change.",
  idempotent: true,
  params: [
    projectIdParam,
    screenIdParam,
    noteIdParam,
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "open", label: "Open" },
        { value: "resolved", label: "Resolved" },
      ],
    },
    colorParam,
    { key: "x", label: "New X", type: "number", validation: { min: 0, max: 1 } },
    { key: "y", label: "New Y", type: "number", validation: { min: 0, max: 1 } },
  ],
  output: [{ key: "updated", type: "boolean", label: "True when the vendor answered 204" }],

  async execute(input, ctx) {
    const body: Record<string, unknown> = {};
    const status = String(input.status ?? "").trim();
    if (status) {
      if (status !== "open" && status !== "resolved") {
        throw new Error("Status must be open or resolved");
      }
      body.status = status;
    }
    const color = String(input.color ?? "").trim();
    if (color) {
      if (!NOTE_COLORS.includes(color)) {
        throw new Error(`Color must be one of ${NOTE_COLORS.join(", ")}`);
      }
      body.color = color;
    }
    const hasX = input.x !== undefined && input.x !== null && input.x !== "";
    const hasY = input.y !== undefined && input.y !== null && input.y !== "";
    if (hasX !== hasY) throw new Error("Set both X and Y to move a note");
    if (hasX) body.position = { x: coord(input.x, "X"), y: coord(input.y, "Y") };
    if (Object.keys(body).length === 0) throw new Error("Set a status, color or position");
    const path = `${screenPath(input)}/notes/${pathId(input.noteId, "Note ID")}`;
    await new ZeplinClient(ctx).request("PATCH", path, { body });
    return { updated: true };
  },
};

export default updateScreenNote;
