import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, ParseurClient, toList } from "../lib/client.ts";
import { exportConfigTypeOptions, mailboxIdParam } from "../lib/params.ts";

/**
 * `POST /parser/{id}/export_config` — create a custom CSV/XLS download.
 *
 * `type: "PARSER_FIELD"` downloads one field's values across every document;
 * `parserFieldId` (an id starting with `PF`, from `mailbox-schema-get` or the
 * Parseur app) is required for that type and ignored for `"PARSER"`.
 */
interface Input {
  mailboxId: string;
  name?: string;
  type?: string;
  parserFieldId?: string;
  items?: string[] | string;
}

const exportConfigCreate: ActionDefinition<Input> = {
  key: "export-config-create",
  type: "perform",
  resource: "export-config",
  title: "Create Custom Download",
  description: "Create a custom CSV/XLS download configuration on a mailbox.",
  idempotent: false,
  params: [
    mailboxIdParam,
    { key: "name", label: "Download name", type: "string" },
    {
      key: "type",
      label: "Type",
      type: "select",
      options: exportConfigTypeOptions,
      default: "PARSER",
    },
    {
      key: "parserFieldId",
      label: "Field ID",
      type: "string",
      hint: 'Required when Type is "Single field". Starts with PF — see mailbox-schema-get.',
    },
    {
      key: "items",
      label: "Columns",
      type: "multiselect",
      hint: 'For a "Whole mailbox" download: the field names to include as columns.',
    },
  ],
  output: [
    { key: "id", type: "number", label: "Custom download ID" },
    { key: "csv_download", type: "string", label: "CSV download path" },
    { key: "xls_download", type: "string", label: "XLS download path" },
  ],

  execute(input, ctx) {
    return new ParseurClient(ctx).request(`/parser/${encodeId(input.mailboxId)}/export_config`, {
      method: "POST",
      body: compact({
        name: input.name,
        type: input.type,
        parser_field_id: input.parserFieldId,
        items: toList(input.items),
      }),
    });
  },
};

export default exportConfigCreate;
