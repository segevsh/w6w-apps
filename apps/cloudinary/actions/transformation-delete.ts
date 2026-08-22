import type { ActionDefinition } from "@w6w/types";
import { CloudinaryClient } from "../lib/client.ts";

/**
 * `DELETE /transformations/{name}` — remove a named transformation, and with it
 * every derived asset it produced.
 *
 * The derived assets are the part that catches people out: deleting the
 * definition does not just break future `t_name` URLs, it deletes the stored
 * renditions already generated from it. The originals are untouched — this can
 * never destroy an uploaded asset — but every page serving `t_name` starts
 * 404ing at the edge.
 *
 * `transformation-list` reports `used: true` for definitions with derived
 * assets behind them; that is the flag to check first.
 */
const action: ActionDefinition = {
  key: "transformation-delete",
  type: "perform",
  resource: "transformation",
  title: "Delete named transformation",
  description:
    "Remove a named transformation and every rendition generated from it. Originals are never " +
    "touched; URLs using `t_name` break.",
  idempotent: true,
  params: [
    {
      key: "name",
      label: "Name",
      type: "string",
      required: true,
      default: "",
    },
    {
      key: "confirm",
      label: "Yes, delete it and its derived renditions",
      type: "boolean",
      required: true,
      default: false,
      hint: "Every URL using `t_<name>` stops working. The original assets are unaffected.",
    },
  ],
  output: [
    { key: "message", type: "string", label: "Result" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const name = String(p.name ?? "").trim();
    if (!name) throw new Error("`name` is required");
    if (p.confirm !== true) {
      throw new Error(
        `refusing to delete transformation "${name}" without \`confirm\` — every derived ` +
          "rendition generated from it goes too, and every URL using it breaks",
      );
    }

    ctx.log("warn", "deleting Cloudinary transformation", { name });
    return await new CloudinaryClient(ctx).request(
      `/transformations/${encodeURIComponent(name)}`,
      { method: "DELETE" },
    );
  },
};

export default action;
