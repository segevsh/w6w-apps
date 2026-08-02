import type { ActionDefinition } from "@w6w/types";
import { ClearbitClient, REVEAL_HOST } from "../lib/client.ts";

interface Input {
  ip: string;
}

/**
 * `GET reveal.clearbit.com/v1/companies/find?ip=...` — the Reveal API:
 * resolves an anonymous website visitor's public IP address to the company
 * it belongs to (B2B IP intelligence — not a person lookup, and not accurate
 * for residential/mobile/VPN IPs, which Clearbit itself documents).
 *
 * The response's `type` field is `"company"` for a real match or `"isp"` /
 * unresolved for consumer ISPs — callers should check it rather than assume
 * every 200 is a usable company match. Confirmed against the official
 * `clearbit-node` SDK (`src/reveal.js`: `resource.create('Reveal', {api:
 * 'reveal', version: 1})`, `find` calls `this.get('/companies/find',
 * options)`).
 */
const action: ActionDefinition<Input> = {
  key: "reveal-company-by-ip",
  type: "read",
  resource: "company",
  title: "Reveal Company by IP",
  description: "Resolve a visitor's public IP address to the company it belongs to.",
  params: [
    { key: "ip", label: "IP Address", type: "string", required: true, placeholder: "8.8.8.8" },
  ],
  output: [
    { key: "type", type: "string", label: "Match Type" },
    { key: "id", type: "string", label: "Company ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "domain", type: "string", label: "Domain" },
  ],

  async execute(input, ctx) {
    const ip = (input.ip ?? "").trim();
    if (!ip) throw new Error("`ip` is required");
    const client = new ClearbitClient(ctx);
    return await client.request(REVEAL_HOST, "/v1/companies/find", { query: { ip } });
  },
};

export default action;
