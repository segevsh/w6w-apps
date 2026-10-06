import type { ActionDefinition } from "@w6w/types";
import { BrandfetchClient } from "../lib/client.ts";

/**
 * `GET /v2/viewer` — identity and credit usage of the API key. The vendor says it
 * is free ("never consume API credits") and that `usage.used` is exact.
 */
const getViewer: ActionDefinition = {
  key: "get-viewer",
  type: "read",
  resource: "account",
  title: "Get API Key Usage",
  description: "Read the connected API key's name, organization and credit usage " +
    "(used / quota) for the current billing period. Free: it never consumes credits.",
  params: [],
  output: [
    { key: "type", type: "string", label: "Credential kind (api-key)" },
    { key: "keyId", type: "string", label: "API key ID" },
    { key: "keyName", type: "string", label: "API key name" },
    { key: "organization", type: "object", label: "Organization id, urn and name" },
    { key: "used", type: "number", label: "Credits used this period" },
    { key: "quota", type: "number", label: "Credit allowance this period" },
    { key: "remaining", type: "number", label: "Credits left (quota - used)" },
  ],

  async execute(_input, ctx) {
    const { body } = await new BrandfetchClient(ctx).request("/v2/viewer");
    const v = (body ?? {}) as {
      type?: string;
      id?: string;
      name?: string | null;
      organization?: unknown;
      usage?: { used?: number; quota?: number };
    };
    const used = v.usage?.used;
    const quota = v.usage?.quota;
    return {
      type: v.type,
      keyId: v.id,
      keyName: v.name ?? null,
      organization: v.organization ?? null,
      used,
      quota,
      remaining: typeof used === "number" && typeof quota === "number"
        ? Math.max(0, quota - used)
        : undefined,
    };
  },
};

export default getViewer;
