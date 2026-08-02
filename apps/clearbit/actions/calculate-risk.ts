import type { ActionDefinition } from "@w6w/types";
import { ClearbitClient, compact, RISK_HOST } from "../lib/client.ts";

interface Input {
  email: string;
  ip?: string;
  given_name?: string;
  family_name?: string;
}

/**
 * `POST risk.clearbit.com/v1/calculate` — the Risk API: scores a sign-up's
 * email (and optionally IP) for fraud signals — disposable/forged/blacklisted
 * email, proxy/blacklisted IP — and returns an overall `risk.level` /
 * `risk.score`. Per Clearbit's own Help Center FAQ ("Autocomplete, Name to
 * Domain, and Risk API FAQ"), Risk is free for existing customers rather than
 * spending a paid enrichment credit.
 *
 * Confirmed against the official `clearbit-node` SDK (`src/risk.js`:
 * `resource.create('Risk', {api: 'risk'})`, `calculate` calls `this.post(
 * '/calculate', options)`) and its test suite (`test/risk.js`,
 * `test/fixtures/risk.json`), which pins both the request shape (`{email,
 * ip}`) and the response shape (`{email, address, ip, risk: {level, score}}`).
 */
const action: ActionDefinition<Input> = {
  key: "calculate-risk",
  type: "perform",
  resource: "risk",
  title: "Calculate Risk",
  description: "Score an email (and optional IP) for fraud signals.",
  idempotent: true,
  params: [
    {
      key: "email",
      label: "Email",
      type: "string",
      required: true,
      placeholder: "name@example.com",
    },
    { key: "ip", label: "IP Address", type: "string" },
  ],
  output: [
    { key: "email", type: "object", label: "Email signals" },
    { key: "ip", type: "object", label: "IP signals" },
    { key: "risk", type: "object", label: "Risk level and score" },
  ],

  async execute(input, ctx) {
    const email = (input.email ?? "").trim();
    if (!email) throw new Error("`email` is required");
    const client = new ClearbitClient(ctx);
    return await client.request(RISK_HOST, "/v1/calculate", {
      method: "POST",
      body: compact({ email, ip: input.ip }),
    });
  },
};

export default action;
