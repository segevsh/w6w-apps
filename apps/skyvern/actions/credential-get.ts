import type { ActionDefinition } from "@w6w/types";
import { SkyvernClient } from "../lib/client.ts";

/** `GET /v1/credentials/{credential_id}` — metadata only; the secret is never returned. */
interface Input {
  credentialId: string;
}

const credentialGet: ActionDefinition<Input> = {
  key: "credential-get",
  type: "read",
  resource: "credential",
  title: "Get Credential",
  description: "Fetch a stored credential's name, type and non-secret details.",
  params: [
    {
      key: "credentialId",
      label: "Credential ID",
      type: "string",
      required: true,
      hint: "Take it from List Credentials.",
    },
  ],
  output: [
    { key: "credential_id", type: "string", label: "Credential ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "credential_type", type: "string", label: "Type (password, credit_card, secret)" },
    { key: "vault_type", type: "string", label: "Vault" },
    { key: "credential", type: "object", label: "Non-secret details (e.g. username, has_totp)" },
    { key: "browser_profile_id", type: "string", label: "Linked browser profile ID" },
  ],

  execute(input, ctx) {
    return new SkyvernClient(ctx).json(`/v1/credentials/${encodeURIComponent(input.credentialId)}`);
  },
};

export default credentialGet;
