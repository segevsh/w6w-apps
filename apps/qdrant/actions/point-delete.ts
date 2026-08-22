import type { ActionDefinition } from "@w6w/types";
import { json, pointIds, QdrantClient } from "../lib/client.ts";
import { COLLECTION_PARAM, WAIT_PARAM } from "../lib/params.ts";

/**
 * `POST /collections/{name}/points/delete` — remove points.
 *
 * ## By id, or by filter — and the second one is the dangerous shape
 *
 * Deleting by id removes exactly what you named. Deleting by **filter** removes
 * everything matching, which is the right tool for "remove this tenant's data"
 * and the wrong one to get slightly wrong: a filter with a typo'd field name
 * does not fail, it matches **nothing** — or, worse, an empty filter object
 * matches **everything**.
 *
 * So this action requires one or the other, refuses an empty filter object
 * outright, and asks for an acknowledgement before a filtered delete. There is
 * no undo and no recycle bin; the only recovery is a snapshot taken earlier.
 *
 * Point deletion in Qdrant is a soft delete until the optimiser runs, but that
 * is an implementation detail and not something a workflow can rely on to
 * reverse a mistake.
 */
const action: ActionDefinition = {
  key: "point-delete",
  type: "perform",
  resource: "point",
  title: "Delete points",
  description:
    "Remove points by id, or by filter. A filtered delete removes everything matching, has no " +
    "undo, and an EMPTY filter matches everything — so it is gated.",
  idempotent: true,
  params: [
    COLLECTION_PARAM,
    {
      key: "ids",
      label: "Point IDs",
      type: "string",
      default: "",
      hint: "Comma-separated or a JSON array. Give these or a filter, not both.",
    },
    {
      key: "filter",
      label: "Filter",
      type: "json",
      default: "",
      hint: "Deletes everything matching. A typo'd field name matches nothing; an empty object " +
        "matches everything, and is refused here.",
    },
    {
      key: "confirmFilterDelete",
      label: "I have checked this filter",
      type: "boolean",
      default: false,
      showIf: { "!=": [{ var: "filter" }, ""] },
      hint: "Required for a filtered delete. The only recovery is a snapshot taken beforehand.",
    },
    WAIT_PARAM,
  ],
  output: [
    { key: "operation_id", type: "number", label: "Qdrant's operation id" },
    { key: "status", type: "string", label: "acknowledged or completed" },
    { key: "byFilter", type: "boolean", label: "Whether the delete was filter-based" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const collection = String(p.collection ?? "").trim();
    if (!collection) throw new Error("`collection` is required");

    const rawIds = String(p.ids ?? "").trim();
    const filter = json(p.filter, "filter") as Record<string, unknown> | undefined;
    if (!rawIds && !filter) throw new Error("give `ids` or a `filter`");
    if (rawIds && filter) {
      throw new Error("give either `ids` or a `filter`, not both — Qdrant takes one selector");
    }

    let body: Record<string, unknown>;
    if (filter) {
      if (Object.keys(filter).length === 0) {
        throw new Error(
          "`filter` is empty, which matches every point in the collection. Name the conditions, " +
            "or use `collection-delete` if removing everything is genuinely the intent",
        );
      }
      if (p.confirmFilterDelete !== true) {
        throw new Error(
          "set `confirmFilterDelete` — a filtered delete removes every matching point with no " +
            "undo, and the only recovery is a snapshot taken beforehand",
        );
      }
      ctx.log("warn", "deleting Qdrant points by filter — there is no undo", { collection });
      body = { filter };
    } else {
      body = { points: pointIds(rawIds, "ids") };
    }

    const result = await new QdrantClient(ctx).request<{ status?: string }>(
      `/collections/${encodeURIComponent(collection)}/points/delete`,
      {
        method: "POST",
        body,
        query: { wait: p.wait === undefined ? true : p.wait === true },
      },
    );

    return { ...result, byFilter: Boolean(filter) };
  },
};

export default action;
