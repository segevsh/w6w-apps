import type { AuthDefinition } from "@w6w/types";
import { NOTION_VERSION } from "../lib/client.ts";

export default {
  key: "oauth-client",
  type: "basic",
  displayName: "OAuth Client (Token Management)",
  description:
    "Client credentials for creating, refreshing, inspecting, or revoking OAuth tokens. Use OAuth or a personal access token for content actions.",
  fields: [
    { key: "clientId", label: "Client ID", type: "string", required: true },
    { key: "clientSecret", label: "Client Secret", type: "secret", required: true },
  ],
  test({ credential }) {
    const fields = credential as Record<string, unknown>;
    const ok = ["clientId", "clientSecret"].every((key) =>
      typeof fields?.[key] === "string" && String(fields[key]).trim().length > 0
    );
    return {
      ok,
      message: ok
        ? "Credential fields supplied. This is a local check; permissions are verified when an action runs."
        : "Required credential fields are missing.",
    };
  },
  sign({ request, credential }) {
    if (!/^\/v1\/oauth\/(token|introspect|revoke)$/.test(new URL(request.url).pathname)) {
      throw new Error("OAuth Client connections only support token management actions.");
    }
    const { clientId, clientSecret } = credential as { clientId: string; clientSecret: string };
    const bytes = new TextEncoder().encode(`${clientId}:${clientSecret}`);
    request.headers.authorization = `Basic ${
      btoa(Array.from(bytes, (b) => String.fromCharCode(b)).join(""))
    }`;
    request.headers["Notion-Version"] = NOTION_VERSION;
    return request;
  },
} satisfies AuthDefinition;
