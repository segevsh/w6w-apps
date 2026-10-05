import type { AuthDefinition } from "@w6w/types";
import { licenseUrl } from "../lib/client.ts";
import { probe } from "../lib/probe.ts";

/**
 * Payhip account API key (LEGACY) — `payhip-api-key: <key>`.
 *
 * Account-wide: it can act on every product's licenses, so it must never ship in a public
 * application. Payhip's own docs steer new integrations to the product secret key.
 * Found under Settings > Developer.
 */
export interface ApiKeyCredential {
  apiKey: string;
}

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "Account API Key (legacy v1)",
  description: "Legacy account-wide key (Settings > Developer). Use the Product Secret Key " +
    "method unless you need one connection to span several products.",
  apiKey: { in: "header", name: "payhip-api-key" },
  fields: [{
    key: "apiKey",
    label: "API Key",
    type: "secret",
    required: true,
    hint: "Payhip > Settings > Developer tab.",
  }],

  sign({ request, credential }) {
    request.headers["payhip-api-key"] = (credential as ApiKeyCredential).apiKey;
    return request;
  },

  async test({ credential }, ctx) {
    const key = ((credential as Partial<ApiKeyCredential>)?.apiKey ?? "").trim();
    if (!key) return { ok: false, message: "credential missing apiKey" };
    return await probe(
      ctx,
      `${licenseUrl("verify", "v1")}?product_link=w6w-probe&license_key=w6w-connection-probe`,
      { "payhip-api-key": key },
    );
  },
};

export default apiKey;
