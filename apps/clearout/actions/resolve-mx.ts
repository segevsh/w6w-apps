import type { ActionDefinition } from "@w6w/types";
import { ClearoutClient, compact } from "../lib/client.ts";

interface Input {
  domain: string;
  timeout?: number;
}

/**
 * `POST /domain/resolve/mx`. The vendor documents the request but not the response body (its
 * OpenAPI 200 is an empty schema), so `data` is returned as is.
 */
const resolveMX: ActionDefinition<Input> = {
  key: "resolve-mx",
  type: "read",
  resource: "domain",
  title: "Resolve MX",
  description: "Find the MX records of a domain. Returns the vendor's result as is.",
  params: [
    { key: "domain", label: "Domain", type: "string", required: true, hint: "e.g. example.com" },
    {
      key: "timeout",
      label: "Timeout (ms)",
      type: "number",
      validation: { min: 1000, integer: true },
      hint: "Vendor default 90000.",
    },
  ],
  output: [{ key: "result", type: "object", label: "Vendor result (shape undocumented)" }],

  async execute(input, ctx) {
    const domain = String(input.domain ?? "").trim();
    if (!domain) throw new Error("domain is required");
    const { data } = await new ClearoutClient(ctx).request("/domain/resolve/mx", {
      body: compact({ domain, timeout: input.timeout }),
    });
    return { result: data ?? null };
  },
};

export default resolveMX;
