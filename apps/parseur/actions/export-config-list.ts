import type { ActionDefinition } from "@w6w/types";
import { encodeId, ParseurClient, type ParseurListPage } from "../lib/client.ts";
import { mailboxIdParam } from "../lib/params.ts";

/**
 * `GET /parser/{id}/export_config` — the custom CSV/XLS downloads configured
 * on a mailbox ("custom downloads" in the Parseur app). No query parameters
 * are documented for this endpoint beyond the mailbox id.
 */
interface Input {
  mailboxId: string;
}

const exportConfigList: ActionDefinition<Input> = {
  key: "export-config-list",
  type: "search",
  resource: "export-config",
  title: "List Custom Downloads",
  description: "List the custom CSV/XLS download configurations on a mailbox.",
  params: [mailboxIdParam],
  output: [
    { key: "count", type: "number", label: "Custom downloads on this page" },
    { key: "current", type: "number", label: "Current page" },
    { key: "total", type: "number", label: "Total pages" },
    { key: "results", type: "array", label: "Custom downloads" },
  ],

  execute(input, ctx) {
    return new ParseurClient(ctx).request<ParseurListPage<unknown>>(
      `/parser/${encodeId(input.mailboxId)}/export_config`,
    );
  },
};

export default exportConfigList;
