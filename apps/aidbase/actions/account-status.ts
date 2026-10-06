import type { ActionDefinition } from "@w6w/types";
import { AidbaseClient } from "../lib/client.ts";

/**
 * Get API Status — Check that the API key is accepted. Returns the API status; the masked key Aidbase echoes back is dropped.
 *
 * Verified against the Aidbase API reference (docs.aidbase.ai, fetched 2026-10-06).
 */
// deno-lint-ignore no-empty-interface
interface Input {}

const accountStatus: ActionDefinition<Input> = {
  key: "account-status",
  type: "read",
  resource: "account",
  title: "Get API Status",
  description:
    "Check that the API key is accepted. Returns the API status; the masked key Aidbase echoes back is dropped.",
  params: [],
  output: [
    {
      "key": "status",
      "type": "string",
      "label": "API status, `ok` when the key is valid",
    },
  ],

  execute(_input, ctx) {
    return new AidbaseClient(ctx).status(`/status`);
  },
};

export default accountStatus;
