import type { ActionDefinition } from "@w6w/types";
import { encodeId, ParseurClient, type ParseurListPage } from "../lib/client.ts";
import { mailboxIdParam } from "../lib/params.ts";

/**
 * `GET /parser/{id}/template_set` — the layout templates a mailbox uses to
 * identify and parse documents. No query parameters are documented for this
 * endpoint beyond the mailbox id.
 */
interface Input {
  mailboxId: string;
}

const templateList: ActionDefinition<Input> = {
  key: "template-list",
  type: "search",
  resource: "template",
  title: "List Templates",
  description: "List the templates configured on a mailbox.",
  params: [mailboxIdParam],
  output: [
    { key: "count", type: "number", label: "Templates on this page" },
    { key: "current", type: "number", label: "Current page" },
    { key: "total", type: "number", label: "Total pages" },
    { key: "results", type: "array", label: "Templates" },
  ],

  execute(input, ctx) {
    return new ParseurClient(ctx).request<ParseurListPage<unknown>>(
      `/parser/${encodeId(input.mailboxId)}/template_set`,
    );
  },
};

export default templateList;
