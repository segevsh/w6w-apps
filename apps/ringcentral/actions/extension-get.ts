import type { ActionDefinition } from "@w6w/types";
import { API_PREFIX, encodeId, RingCentralClient } from "../lib/client.ts";
import { accountIdParam, extensionIdParam } from "../lib/params.ts";

/**
 * `GET /restapi/v1.0/account/{accountId}/extension/{extensionId}` — one
 * extension's profile: name, number, type, status, contact info, permissions.
 *
 * This is the same endpoint both auth methods' `test`/`afterConnect` hooks
 * probe as the connection whoami (`lib/client.ts` `WHOAMI_PATH`), exposed
 * here as an ordinary read for workflows that need it. Needs `ReadAccounts`
 * (app) / `ReadExtensions` (user).
 */
interface Input {
  accountId?: string;
  extensionId?: string;
}

const extensionGet: ActionDefinition<Input> = {
  key: "extension-get",
  type: "read",
  resource: "extension",
  title: "Get Extension",
  description: "Fetch one extension's profile — name, number, type, status and contact info.",
  params: [accountIdParam, extensionIdParam],
  output: [
    { key: "id", type: "string", label: "Extension ID" },
    { key: "extensionNumber", type: "string", label: "Extension short number" },
    { key: "name", type: "string", label: "Extension name" },
    { key: "type", type: "string", label: "Extension type" },
    { key: "status", type: "string", label: "Extension status" },
    { key: "contact", type: "object", label: "Contact info (email, phone numbers, …)" },
  ],

  execute(input, ctx) {
    return new RingCentralClient(ctx).request(
      `${API_PREFIX}/account/${encodeId(input.accountId)}/extension/${encodeId(input.extensionId)}`,
    );
  },
};

export default extensionGet;
