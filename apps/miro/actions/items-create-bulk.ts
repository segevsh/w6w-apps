import type { ActionDefinition } from "@w6w/types";
import { json, MiroClient } from "../lib/client.ts";
import { BOARD_PARAM } from "../lib/params.ts";

/**
 * `POST /v2/boards/{board_id}/items/bulk` — verified against Miro's OpenAPI
 * document (`create-items`), whose request body is a **bare array**, not an
 * object.
 *
 * The endpoint's own description spells out the cost, which is worth repeating
 * because it surprises people: rate limiting is "Level 2 per item", so creating
 * one sticky note, one card and one shape in a single call costs **300
 * credits** — 100 each — not 100 for the call. Bulk saves round trips, not
 * quota.
 *
 * The payload is passed as JSON: each entry is a typed item object
 * (`{type, data, style, position, geometry}`), and a batch is generated
 * upstream rather than typed into a form.
 */
const action: ActionDefinition = {
  key: "items-create-bulk",
  type: "perform",
  resource: "item",
  title: "Create items in bulk",
  description: "Create up to 20 items of mixed types in one request.",
  idempotent: false,
  params: [
    BOARD_PARAM,
    {
      key: "items",
      label: "Items",
      type: "json",
      required: true,
      default: "",
      placeholder: '[{"type":"sticky_note","data":{"content":"Hi"},"position":{"x":0,"y":0}}]',
      hint: "An array of typed item objects. Miro accepts at most 20, and bills each one.",
    },
  ],
  output: [
    { key: "data", type: "array", label: "Created items" },
    { key: "type", type: "string", label: "Response type" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const boardId = String(p.boardId ?? "").trim();
    if (!boardId) throw new Error("`boardId` is required");
    const items = json(p.items, "items");
    if (!Array.isArray(items) || items.length === 0) {
      throw new Error("`items` is required — a non-empty array of item objects");
    }
    if (items.length > 20) {
      // Miro's documented cap for this endpoint.
      throw new Error(`Miro accepts at most 20 items per bulk call — got ${items.length}`);
    }

    ctx.log("info", "creating Miro items in bulk", { boardId, count: items.length });

    return await new MiroClient(ctx).request(
      `/v2/boards/${encodeURIComponent(boardId)}/items/bulk`,
      // The endpoint takes the bare array as its whole body.
      { method: "POST", body: items },
    );
  },
};

export default action;
