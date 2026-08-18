import type { ActionDefinition } from "@w6w/types";
import { ChecklyClient } from "../lib/client.ts";

/**
 * `DELETE /v1/variables/{key}` — verified against Checkly's OpenAPI document
 * (`deleteV1VariablesKey`).
 *
 * **A check that reads a deleted variable does not fail loudly.** Depending on
 * the script it may read `undefined` and request the wrong URL, or assert
 * against nothing — so the monitor goes on passing while measuring something
 * else. That is the failure this note exists to flag, and why the action asks
 * for confirmation on a call that otherwise looks trivial.
 */
const action: ActionDefinition = {
  key: "variable-delete",
  type: "perform",
  resource: "variable",
  title: "Delete an environment variable",
  description: "Delete a variable. Checks that read it may keep passing while testing nothing.",
  idempotent: true,
  params: [
    { key: "key", label: "Key", type: "string", required: true, default: "" },
    {
      key: "confirm",
      label: "I have checked that no check reads this variable",
      type: "boolean",
      required: true,
      default: false,
      hint: "Must be on. A script reading a missing variable often passes rather than failing.",
    },
  ],
  output: [
    { key: "key", type: "string", label: "Key" },
    { key: "deleted", type: "boolean", label: "Deleted" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const key = String(p.key ?? "").trim();
    if (!key) throw new Error("`key` is required");
    if (p.confirm !== true) {
      throw new Error(
        "`confirm` must be true — a check reading a deleted variable may pass while testing " +
          "nothing",
      );
    }

    ctx.log("warn", "deleting a Checkly environment variable", { key });

    await new ChecklyClient(ctx).request(`/v1/variables/${encodeURIComponent(key)}`, {
      method: "DELETE",
    });
    return { key, deleted: true };
  },
};

export default action;
