import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * Service Account (`serviceAccount`). The user pastes the downloaded service
 * account JSON key into one credential field; the host validates it, mints
 * short-lived Google access tokens (domain-wide delegation when a
 * `delegatedUser` is bound), and hands each signed request a derived token.
 *
 * This module only attaches that token and probes the API. It holds no key
 * material and mints nothing. The scopes below are the app's full scope set.
 */
const serviceAccount: AuthDefinition = {
  key: "service-account",
  type: "serviceAccount",
  displayName: "Google Service Account",
  description:
    "Google service account JSON key with domain-wide delegation. The host mints the access token; paste the key once.",
  connectionLabel: "{{user.email}}",
  fields: [
    {
      key: "serviceAccountKey",
      label: "Service account key (JSON)",
      type: "json",
      secret: true,
      required: true,
      ui: "textarea",
      hint: "Paste the whole JSON key file downloaded from Google Cloud for the service account.",
    },
  ],
  serviceAccount: {
    accepts: ["google-service-account.v1"],
    scopes: [
      "https://www.googleapis.com/auth/gmail.modify",
      "https://www.googleapis.com/auth/gmail.send",
    ],
    impersonation: "required",
    bindingFields: [
      {
        key: "delegatedUser",
        label: "Impersonated user",
        type: "string",
        required: true,
        hint:
          "Workspace user to act as. Required: a service account has no mailbox or admin rights of its own.",
      },
    ],
  },

  sign({ request, credential }) {
    const token = (credential as { accessToken?: unknown } | null | undefined)?.accessToken;
    if (typeof token !== "string" || token === "") {
      throw new Error("service-account: no derived access token was provided");
    }
    request.headers["authorization"] = `Bearer ${token}`;
    return request;
  },

  async test(_input, ctx) {
    // The runtime signs this request (D-A3); the hook never reads the credential.
    const res = await ctx.fetch(`${API_URL}/users/me/profile`);
    if (res.ok) return { ok: true };
    return {
      ok: false,
      message:
        `Gmail returned ${res.status}. Check the service account key, and that domain-wide delegation grants the required scopes.`,
    };
  },

  async afterConnect(_input, ctx) {
    // Signed by the runtime (D-A3); no authorization is set here.
    const res = await ctx.fetch(`${API_URL}/users/me/profile`);
    if (!res.ok) return {};
    const profile = await res.json().catch(() => null) as { emailAddress?: string } | null;
    if (!profile?.emailAddress) return {};
    return { user: { email: profile.emailAddress } };
  },
};

export default serviceAccount;
