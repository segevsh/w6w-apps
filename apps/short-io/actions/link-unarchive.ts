import type { ActionDefinition } from "@w6w/types";
import { compact, ShortClient } from "../lib/client.ts";

interface Input {
  linkId: string;
  domainId?: string;
}

/**
 * POST /links/unarchive with `{link_id, domain_id?}`. `domain_id` is only needed
 * when `link_id` is a legacy numeric id. Setting the same state twice is a no-op.
 */
const linkUnarchive: ActionDefinition<Input, { success: boolean }> = {
  key: "link-unarchive",
  type: "perform",
  resource: "link",
  title: "Unarchive Link",
  description: "Unarchive a link by its id.",
  idempotent: true,
  params: [
    {
      key: "linkId",
      label: "Link ID",
      type: "string",
      required: true,
      placeholder: "lnk_abc123_def456",
    },
    {
      key: "domainId",
      label: "Domain ID",
      type: "string",
      hint: "Only for a legacy numeric link id.",
    },
  ],
  output: [{ key: "success", type: "boolean", label: "Succeeded" }],

  async execute(input, ctx) {
    const res = await new ShortClient(ctx).request<{ success?: boolean; error?: string }>(
      "/links/unarchive",
      { method: "POST", body: compact({ link_id: input.linkId, domain_id: input.domainId }) },
    );
    if (res?.success === false) {
      throw new Error(
        `Short.io could not unarchive ${input.linkId}: ${res.error ?? "unknown error"}`,
      );
    }
    return { success: true };
  },
};

export default linkUnarchive;
