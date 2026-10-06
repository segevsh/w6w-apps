import type { ActionDefinition } from "@w6w/types";
import { SliteClient } from "../lib/client.ts";

/** `GET /v1/me` — the authenticated user's email, display name and organization. */
const meGet: ActionDefinition<Record<string, never>> = {
  key: "me-get",
  type: "read",
  resource: "user",
  title: "Get Authenticated User",
  description: "Return the user the API key belongs to, with their organization's name and domain.",
  params: [],
  output: [
    { key: "email", type: "string", label: "Email" },
    { key: "displayName", type: "string", label: "Display name" },
    { key: "organizationName", type: "string", label: "Organization name" },
    { key: "organizationDomain", type: "string", label: "Organization domain" },
  ],
  execute(_input, ctx) {
    return new SliteClient(ctx).get("/me");
  },
};

export default meGet;
