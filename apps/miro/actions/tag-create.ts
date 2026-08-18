import type { ActionDefinition } from "@w6w/types";
import { compact, MiroClient } from "../lib/client.ts";
import { BOARD_PARAM } from "../lib/params.ts";

/**
 * `POST /v2/boards/{board_id}/tags` — verified against Miro's OpenAPI document
 * (`create-tag`; body requires `title`).
 *
 * Creating a tag does not put it on anything — `tag-attach` does that.
 */
const action: ActionDefinition = {
  key: "tag-create",
  type: "perform",
  resource: "tag",
  title: "Create a tag",
  description: "Create a tag on a board.",
  idempotent: false,
  params: [
    BOARD_PARAM,
    { key: "title", label: "Title", type: "string", required: true, default: "" },
    {
      key: "fillColor",
      label: "Colour",
      type: "select",
      default: "",
      options: [
        { value: "red", label: "Red" },
        { value: "magenta", label: "Magenta" },
        { value: "violet", label: "Violet" },
        { value: "light_green", label: "Light green" },
        { value: "green", label: "Green" },
        { value: "dark_green", label: "Dark green" },
        { value: "cyan", label: "Cyan" },
        { value: "blue", label: "Blue" },
        { value: "dark_blue", label: "Dark blue" },
        { value: "yellow", label: "Yellow" },
        { value: "gray", label: "Gray" },
        { value: "black", label: "Black" },
      ],
    },
  ],
  output: [
    { key: "id", type: "string", label: "Tag ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "fillColor", type: "string", label: "Colour" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const boardId = String(p.boardId ?? "").trim();
    const title = String(p.title ?? "").trim();
    if (!boardId) throw new Error("`boardId` is required");
    if (!title) throw new Error("`title` is required");

    ctx.log("info", "creating Miro tag", { boardId, title });

    return await new MiroClient(ctx).request(
      `/v2/boards/${encodeURIComponent(boardId)}/tags`,
      { method: "POST", body: compact({ title, fillColor: p.fillColor }) },
    );
  },
};

export default action;
