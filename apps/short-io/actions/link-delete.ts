import type { ActionDefinition } from "@w6w/types";
import { ShortClient } from "../lib/client.ts";

interface Input {
  linkId: string;
}

interface Result {
  success: boolean;
  idString?: string;
}

/**
 * DELETE /links/{link_id} — the path parameter must be the encoded id
 * (`lnk_…_…`); the vendor's pattern rejects the legacy numeric id here. A 200
 * with `success: false` is treated as a failure, since the vendor carries its
 * own error in that body.
 */
const linkDelete: ActionDefinition<Input, Result> = {
  key: "link-delete",
  type: "perform",
  resource: "link",
  title: "Delete Link",
  description: "Permanently delete a link by its id.",
  idempotent: true,
  params: [
    {
      key: "linkId",
      label: "Link ID",
      type: "string",
      required: true,
      placeholder: "lnk_abc123_def456",
    },
  ],
  output: [
    { key: "success", type: "boolean", label: "Deleted" },
    { key: "idString", type: "string", label: "Link ID" },
  ],

  async execute(input, ctx) {
    const res = await new ShortClient(ctx).request<
      { success?: boolean; idString?: string; error?: string }
    >(`/links/${encodeURIComponent(input.linkId)}`, { method: "DELETE" });
    if (res?.success === false) {
      throw new Error(`Short.io could not delete ${input.linkId}: ${res.error ?? "unknown error"}`);
    }
    return { success: true, idString: res?.idString ?? input.linkId };
  },
};

export default linkDelete;
