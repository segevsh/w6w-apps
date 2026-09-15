import type { ActionDefinition } from "@w6w/types";
import { encodeId, ParseurClient } from "../lib/client.ts";
import { templateIdParam } from "../lib/params.ts";

/**
 * `POST /template/{id}/copy/{target_mailbox_id}` — copy a template into
 * another mailbox.
 *
 * The OpenAPI document declares a bare `201` with no response schema, so the
 * body is returned through as-is.
 */
interface Input {
  templateId: string;
  targetMailboxId: string;
}

const templateCopy: ActionDefinition<Input> = {
  key: "template-copy",
  type: "perform",
  resource: "template",
  title: "Copy Template",
  description: "Copy a template into another mailbox.",
  idempotent: false,
  params: [
    templateIdParam,
    {
      key: "targetMailboxId",
      label: "Target mailbox ID",
      type: "string",
      required: true,
    },
  ],
  output: [{ key: "result", type: "object", label: "Vendor response (undocumented shape)" }],

  async execute(input, ctx) {
    const result = await new ParseurClient(ctx).request(
      `/template/${encodeId(input.templateId)}/copy/${encodeId(input.targetMailboxId)}`,
      { method: "POST" },
    );
    return { result };
  },
};

export default templateCopy;
