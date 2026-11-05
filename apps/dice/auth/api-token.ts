import type { AuthDefinition, SignHook } from "@w6w/types";
import { API_URL, isObject, responseData, VIEWER_QUERY } from "../lib/client.ts";

const sign: SignHook = ({ request, credential }) => {
  if (!isObject(credential) || typeof credential.token !== "string" || !credential.token.trim()) {
    throw new Error("DICE API token is required.");
  }
  // Do not stamp credentials onto any other endpoint, even if a future manifest widens egress.
  if (request.url !== API_URL) {
    throw new Error("DICE token can only sign the partner GraphQL endpoint.");
  }
  request.headers.authorization = `Bearer ${credential.token}`;
  return request;
};

const auth: AuthDefinition = {
  key: "api-token",
  type: "bearer",
  displayName: "MIO API token",
  description:
    "Generate a partner API token in DICE MIO. Available records and fields depend on its permissions.",
  fields: [{
    key: "token",
    label: "API token",
    type: "secret",
    required: true,
    hint: "Paste the token generated in DICE MIO, without the Bearer prefix.",
  }],
  sign,
  async test({ credential }, ctx) {
    try {
      // Ordinary bearer auth tests receive an unsigned fetch in the current ABI.
      // Reuse the sign hook so only it interprets/stamps the credential.
      const request = await sign({
        credential,
        request: {
          url: API_URL,
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ query: VIEWER_QUERY }),
        },
      }, ctx);
      const data = await responseData(
        await ctx.fetch(request.url, {
          method: request.method,
          headers: request.headers,
          body: request.body as string,
        }),
      );
      return isObject(data.viewer) && data.viewer.id != null
        ? { ok: true }
        : { ok: false, message: "DICE returned no authenticated partner." };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : "DICE token check failed.",
      };
    }
  },
};
export default auth;
