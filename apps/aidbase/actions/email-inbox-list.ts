import type { ActionDefinition } from "@w6w/types";
import { AidbaseClient } from "../lib/client.ts";

/**
 * List Email Inboxs — List the email inboxs in the account.
 *
 * Verified against the Aidbase API reference (docs.aidbase.ai, fetched 2026-10-06).
 */
// deno-lint-ignore no-empty-interface
interface Input {}

const emailInboxList: ActionDefinition<Input> = {
  key: "email-inbox-list",
  type: "read",
  resource: "email-inbox",
  title: "List Email Inboxs",
  description: "List the email inboxs in the account.",
  params: [],
  output: [
    {
      "key": "items",
      "type": "array",
      "label": "Email Inboxs",
    },
    {
      "key": "count",
      "type": "number",
      "label": "Number returned",
    },
  ],

  execute(_input, ctx) {
    return new AidbaseClient(ctx).array(`/email-inboxes`);
  },
};

export default emailInboxList;
