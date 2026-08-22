import type { ActionDefinition } from "@w6w/types";
import { compact, geometry, MiroClient, position } from "../lib/client.ts";
import { BOARD_PARAM, GEOMETRY_PARAMS, PARENT_PARAM, POSITION_PARAMS } from "../lib/params.ts";

/**
 * `POST /v2/boards/{board_id}/cards` — verified against Miro's OpenAPI document
 * (`create-card-item`), whose `data` carries `title`, `description`,
 * `assigneeId` and `dueDate`.
 *
 * This is the plain card. Miro also has an **app card**
 * (`/v2/boards/{id}/app_cards`), which is the one an integration owns and can
 * mark as synced; it is a different resource with different fields and is not
 * folded in here.
 */
const action: ActionDefinition = {
  key: "card-create",
  type: "perform",
  resource: "card",
  title: "Create a card",
  description: "Add a card to a board.",
  idempotent: false,
  params: [
    BOARD_PARAM,
    { key: "title", label: "Title", type: "string", required: true, default: "" },
    { key: "description", label: "Description", type: "text", default: "" },
    {
      key: "assigneeId",
      label: "Assignee ID",
      type: "string",
      default: "",
      hint: "A Miro user id.",
    },
    {
      key: "dueDate",
      label: "Due Date",
      type: "datetime",
      default: "",
      hint: "ISO 8601.",
    },
    {
      key: "cardTheme",
      label: "Theme Colour",
      type: "string",
      default: "",
      placeholder: "#2d9bf0",
      hint: "Hex colour for the card's accent.",
    },
    ...POSITION_PARAMS,
    ...GEOMETRY_PARAMS,
    PARENT_PARAM,
  ],
  output: [
    { key: "id", type: "string", label: "Item ID" },
    { key: "type", type: "string", label: "Item type" },
    { key: "data", type: "object", label: "Card data" },
    { key: "style", type: "object", label: "Style" },
    { key: "position", type: "object", label: "Position" },
    { key: "createdAt", type: "string", label: "Created at" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const boardId = String(p.boardId ?? "").trim();
    const title = String(p.title ?? "").trim();
    if (!boardId) throw new Error("`boardId` is required");
    if (!title) throw new Error("`title` is required");

    const body = compact({
      data: compact({
        title,
        description: p.description,
        assigneeId: p.assigneeId,
        dueDate: p.dueDate,
      }),
      style: compact({ cardTheme: p.cardTheme }),
      position: position(p.x, p.y),
      geometry: geometry(p.width, p.height),
      parent: p.parentId ? { id: String(p.parentId) } : undefined,
    });

    ctx.log("info", "creating Miro card", { boardId, title });

    return await new MiroClient(ctx).request(
      `/v2/boards/${encodeURIComponent(boardId)}/cards`,
      { method: "POST", body },
    );
  },
};

export default action;
