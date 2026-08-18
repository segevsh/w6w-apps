import type { ActionDefinition } from "@w6w/types";
import { AshbyClient } from "../lib/client.ts";

/**
 * `POST /apiKey.info` — what can this key do?
 *
 * Ashby scopes keys per module, granted in the Ashby app, so a key can
 * authenticate perfectly and be refused by half a workflow. This returns the
 * granted scopes, which makes two things possible:
 *
 *   - a workflow can **check before it acts** — read the scopes at the top of a
 *     run and branch, rather than failing on step four with an opaque refusal;
 *   - an access review can list what the automation credentials in an ATS
 *     actually reach, which is a question worth asking about a system holding
 *     everybody's interview feedback.
 *
 * It needs the `apiKeysRead` scope itself, so a narrow key is refused here —
 * correctly, and the error says so rather than looking like an outage.
 *
 * The response contains the key's **title and scopes, never its value**.
 */
const action: ActionDefinition = {
  key: "api-key-info",
  type: "read",
  resource: "api-key",
  title: "Get this API key's permissions",
  description:
    "The scopes granted to the key this connection uses — so a workflow can check before it " +
    "acts, rather than failing on step four. Requires the `apiKeysRead` scope itself.",
  params: [],
  output: [
    { key: "title", type: "string", label: "The key's name in Ashby" },
    { key: "createdAt", type: "string", label: "When it was created" },
    { key: "scopes", type: "array", label: "Granted scopes" },
    { key: "canWrite", type: "boolean", label: "Whether any scope permits writing" },
  ],

  async execute(_input, ctx) {
    const info = await new AshbyClient(ctx).request<{ title?: string; scopes?: string[] }>(
      "apiKey.info",
    );
    const scopes = info?.scopes ?? [];
    return {
      ...info,
      scopes,
      canWrite: scopes.some((s) => /write|delete/i.test(s)),
    };
  },
};

export default action;
