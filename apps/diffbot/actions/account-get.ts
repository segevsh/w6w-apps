import type { ActionDefinition } from "@w6w/types";
import { compact, DiffbotClient } from "../lib/client.ts";

interface Input {
  days?: number;
}

interface Usage {
  date?: string;
  credits?: number;
  [k: string]: unknown;
}

/**
 * `GET /v4/account` — plan, status and daily usage for the token.
 *
 * **The vendor's response echoes the token itself and every child token**
 * (`token`, `childTokens`). This action drops both before returning: a workflow
 * run record must never carry a credential. Only the number of child tokens is
 * kept.
 */
const accountGet: ActionDefinition<Input> = {
  key: "account-get",
  type: "read",
  resource: "account",
  title: "Get Account Usage",
  description: "Read the plan, status, monthly credit allowance and daily API usage of the " +
    "connected token. The token and child tokens the vendor echoes are never returned.",
  params: [
    {
      key: "days",
      label: "Days of usage",
      type: "number",
      hint: "Days of daily call volumes to return (vendor default 31).",
      validation: { min: 1, integer: true },
    },
  ],
  output: [
    { key: "name", type: "string", label: "Account name" },
    { key: "email", type: "string", label: "Account email" },
    { key: "plan", type: "string", label: "Current plan" },
    { key: "planCredits", type: "number", label: "Monthly credits included in the plan" },
    { key: "status", type: "string", label: "Token status" },
    { key: "created", type: "string", label: "Token creation date" },
    { key: "childTokenCount", type: "number", label: "Number of child tokens" },
    { key: "usage", type: "array", label: "Per-day usage: date, credits, extractions, nlp, …" },
    { key: "creditsInWindow", type: "number", label: "Credits used across the returned days" },
  ],

  async execute(input, ctx) {
    const { body } = await new DiffbotClient(ctx).request("/v4/account", {
      query: compact({ days: input.days }) as Record<string, number>,
    });
    const a = (body ?? {}) as Record<string, unknown>;
    const usage = Array.isArray(a.usage) ? a.usage as Usage[] : [];
    return {
      name: a.name,
      email: a.email,
      plan: a.plan,
      planCredits: a.planCredits,
      status: a.status,
      created: a.created,
      childTokenCount: Array.isArray(a.childTokens) ? a.childTokens.length : 0,
      usage,
      creditsInWindow: usage.reduce(
        (n, d) => n + (typeof d.credits === "number" ? d.credits : 0),
        0,
      ),
    };
  },
};

export default accountGet;
