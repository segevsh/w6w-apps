import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, ParseurClient, toList } from "../lib/client.ts";
import { exportConfigTypeOptions, mailboxIdParam } from "../lib/params.ts";

/**
 * `PATCH /parser/{mailbox_id}/export_config/{id}` — update a custom download.
 *
 * `idempotent: true`: sending the same body twice leaves the same
 * configuration either time.
 */
interface Input {
  mailboxId: string;
  exportConfigId: string;
  name?: string;
  type?: string;
  parserFieldId?: string;
  items?: string[] | string;
}

const exportConfigUpdate: ActionDefinition<Input> = {
  key: "export-config-update",
  type: "perform",
  resource: "export-config",
  title: "Update Custom Download",
  description: "Update a custom CSV/XLS download configuration.",
  idempotent: true,
  params: [
    mailboxIdParam,
    {
      key: "exportConfigId",
      label: "Custom download ID",
      type: "string",
      required: true,
    },
    { key: "name", label: "Download name", type: "string" },
    { key: "type", label: "Type", type: "select", options: exportConfigTypeOptions },
    { key: "parserFieldId", label: "Field ID", type: "string" },
    { key: "items", label: "Columns", type: "multiselect" },
  ],
  output: [
    { key: "id", type: "number", label: "Custom download ID" },
    { key: "name", type: "string", label: "Download name" },
  ],

  execute(input, ctx) {
    return new ParseurClient(ctx).request(
      `/parser/${encodeId(input.mailboxId)}/export_config/${encodeId(input.exportConfigId)}`,
      {
        method: "PATCH",
        body: compact({
          name: input.name,
          type: input.type,
          parser_field_id: input.parserFieldId,
          items: toList(input.items),
        }),
      },
    );
  },
};

export default exportConfigUpdate;
