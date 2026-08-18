import type { ActionDefinition } from "@w6w/types";
import { CloudinaryClient } from "../lib/client.ts";

/**
 * `GET /usage` — what the account has spent this period.
 *
 * The one call that reports **both** ceilings a workflow can hit: the plan's
 * credit (or transformation / storage / bandwidth) budget in the body, and the
 * hourly API request allowance in the `X-FeatureRateLimit-*` response headers.
 * Those are separate limits with separate consequences — running out of credits
 * changes the bill, running out of requests stops the batch job — and this
 * action surfaces the headers alongside the body so a workflow can act on
 * either.
 *
 * The body's fields depend on the plan: credit-based plans report
 * `credits.{usage,limit}`, older ones report transformations, storage and
 * bandwidth separately. Everything Cloudinary sends is passed through
 * unchanged rather than normalised into a shape it might not have.
 */
const action: ActionDefinition = {
  key: "usage-get",
  type: "read",
  resource: "account",
  title: "Get account usage",
  description:
    "Plan usage — credits or transformations, storage and bandwidth — plus the hourly API " +
    "request allowance from the rate-limit headers.",
  params: [
    {
      key: "date",
      label: "Date",
      type: "string",
      default: "",
      advanced: true,
      placeholder: "1-8-2026",
      hint: "A past day's usage, in Cloudinary's `d-m-yyyy` format. Empty means the current " +
        "period.",
    },
  ],
  output: [
    { key: "plan", type: "string", label: "Plan" },
    { key: "credits", type: "object", label: "Credits" },
    { key: "storage", type: "object", label: "Storage" },
    { key: "bandwidth", type: "object", label: "Bandwidth" },
    { key: "transformations", type: "object", label: "Transformations" },
    { key: "rate_limit", type: "object", label: "Hourly API allowance (from headers)" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const client = new CloudinaryClient(ctx);
    const date = String(p.date ?? "").trim();

    // The headers are only visible on the raw response, so this one action
    // reads it directly rather than going through `request`.
    const url = new URL(`${client.base}/usage`);
    if (date) url.searchParams.set("date", date);
    const res = await ctx.fetch(url.toString(), { headers: { accept: "application/json" } });
    if (!res.ok) {
      const detail = res.headers.get("x-cld-error") ?? (await res.text().catch(() => ""));
      throw new Error(`Cloudinary ${res.status} for GET /usage: ${detail.slice(0, 200)}`);
    }

    const body = await res.json().catch(() => ({})) as Record<string, unknown>;
    const num = (name: string) => {
      const raw = res.headers.get(name);
      const n = raw === null ? NaN : Number(raw);
      return Number.isFinite(n) ? n : undefined;
    };
    return {
      ...body,
      rate_limit: {
        limit: num("x-featureratelimit-limit"),
        remaining: num("x-featureratelimit-remaining"),
        reset: res.headers.get("x-featureratelimit-reset") ?? undefined,
      },
    };
  },
};

export default action;
