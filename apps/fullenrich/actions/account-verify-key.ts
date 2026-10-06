import type { ActionDefinition } from "@w6w/types";
import { FullEnrichClient } from "../lib/client.ts";

/** `GET /account/keys/verify` — answers `{ workspace_id }` for a valid key. */
const accountVerifyKey: ActionDefinition<Record<string, never>> = {
  key: "account-verify-key",
  type: "read",
  resource: "account",
  title: "Verify API Key",
  description: "Check that the connected API key is valid and return the workspace it belongs to.",
  params: [],
  output: [{ key: "workspaceId", type: "string", label: "Workspace ID" }],

  async execute(_input, ctx) {
    const res = await new FullEnrichClient(ctx).request<{ workspace_id?: string }>(
      "GET",
      "/account/keys/verify",
    );
    return { workspaceId: res.workspace_id ?? null };
  },
};

export default accountVerifyKey;
