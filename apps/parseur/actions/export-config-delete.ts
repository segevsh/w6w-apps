import type { ActionDefinition } from "@w6w/types";
import { encodeId, ParseurClient } from "../lib/client.ts";
import { mailboxIdParam } from "../lib/params.ts";

/**
 * `DELETE /parser/{mailbox_id}/export_config/{id}` — delete a custom download
 * configuration. No response schema is documented, so only the HTTP status
 * is reported.
 */
interface Input {
  mailboxId: string;
  exportConfigId: string;
}

const exportConfigDelete: ActionDefinition<Input> = {
  key: "export-config-delete",
  type: "perform",
  resource: "export-config",
  title: "Delete Custom Download",
  description: "Delete a custom CSV/XLS download configuration.",
  idempotent: true,
  params: [
    mailboxIdParam,
    {
      key: "exportConfigId",
      label: "Custom download ID",
      type: "string",
      required: true,
    },
  ],
  output: [
    { key: "exportConfigId", type: "string", label: "Custom download deleted" },
    { key: "status", type: "number", label: "HTTP status" },
  ],

  async execute(input, ctx) {
    const status = await new ParseurClient(ctx).status(
      `/parser/${encodeId(input.mailboxId)}/export_config/${encodeId(input.exportConfigId)}`,
      { method: "DELETE" },
    );
    return { exportConfigId: input.exportConfigId, status };
  },
};

export default exportConfigDelete;
