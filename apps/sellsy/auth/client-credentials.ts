import type { AuthDefinition } from "@w6w/types";
import { mintToken, probeAccess } from "./_shared.ts";

/**
 * A **personal** Sellsy OAuth client (client credentials grant). Sellsy's
 * description of the flow: "Only personal clients can use this authentication
 * flow" — it is bound to one staff member and needs no browser sign-in, which is
 * what makes it work in scheduled runs.
 *
 * The scopes are whatever was ticked on the client in Sellsy; the request asks
 * for none. There is no refresh token, so `refresh` repeats the grant with the
 * stored id and secret.
 */
const clientCredentials: AuthDefinition = {
  key: "client-credentials",
  type: "custom",
  displayName: "Personal OAuth client (client credentials)",
  description:
    "A personal OAuth client created in Sellsy (Settings → API → V2 access). No browser " +
    "sign-in, so it works in scheduled runs; it acts as the staff member who owns it.",
  fields: [
    {
      key: "clientId",
      label: "Client ID",
      type: "secret",
      required: true,
      row: "client",
    },
    {
      key: "clientSecret",
      label: "Client Secret",
      type: "secret",
      required: true,
      row: "client",
    },
  ],

  exchange({ fields }, ctx) {
    const { clientId, clientSecret } = (fields ?? {}) as Record<string, string>;
    if (!clientId || !clientSecret) {
      return Promise.reject(new Error("Client ID and Client Secret are required."));
    }
    return mintToken(ctx, { clientId, clientSecret });
  },

  refresh({ credential }, ctx) {
    const { clientId, clientSecret } = credential as Record<string, string>;
    return mintToken(ctx, { clientId, clientSecret });
  },

  sign({ request, credential }) {
    const { accessToken } = credential as { accessToken: string };
    request.headers["authorization"] = `Bearer ${accessToken}`;
    return request;
  },

  test: ({ credential }, ctx) => probeAccess(credential, ctx),
};

export default clientCredentials;
