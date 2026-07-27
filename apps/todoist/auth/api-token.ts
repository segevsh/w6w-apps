import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * Todoist API token (`bearer`). Copy it from Todoist → Settings →
 * Integrations → Developer, and paste it here. Every request signs with
 * `Authorization: Bearer <token>`.
 */
const apiToken: AuthDefinition = {
  key: "api-token",
  type: "bearer",
  displayName: "API Token",
  description: "Paste the API token from Todoist → Settings → Integrations → Developer.",
  fields: [
    {
      key: "apiToken",
      label: "API Token",
      type: "secret",
      required: true,
      hint: "Todoist → Settings → Integrations → Developer → API token.",
    },
  ],

  sign({ request, credential }) {
    const { apiToken } = credential as { apiToken: string };
    request.headers["authorization"] = `Bearer ${apiToken}`;
    return request;
  },

  async test({ credential }, ctx) {
    const { apiToken } = credential as { apiToken: string };
    const res = await ctx.fetch(`${API_URL}/projects`, {
      headers: { authorization: `Bearer ${apiToken}` },
    });
    if (!res.ok) return { ok: false, message: `Todoist returned ${res.status}` };
    return { ok: true };
  },
};

export default apiToken;
