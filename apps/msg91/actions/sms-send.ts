import type { ActionDefinition } from "@w6w/types";
import {
  call,
  normalizeMobile,
  parseJsonField,
  parseList,
  pick,
  requireStr,
} from "../lib/client.ts";
import { bool, int, json, str, text } from "../lib/params.ts";

type Input = Record<string, unknown>;

const smsSend: ActionDefinition<Input> = {
  key: "sms-send",
  type: "perform",
  resource: "sms",
  title: "Send SMS",
  description:
    "Send an SMS from a DLT-approved MSG91 template (flow) to one or many numbers, with per-recipient variables.",
  idempotent: false,
  params: [
    str("templateId", "Template ID", {
      required: true,
      hint: "The SMS template (flow) ID from the SMS section of your MSG91 account.",
    }),
    text("mobiles", "Mobile numbers", {
      hint:
        "Comma-separated, international format with country code (919876543210). Every number gets the same Variables. Use Recipients instead for per-number values.",
    }),
    json("variables", "Variables", {
      hint:
        'Template variables as an object, e.g. {"VAR1": "Ada"}. Names are case-sensitive and must match the template\'s ##name## placeholders.',
    }),
    json("recipients", "Recipients", {
      hint:
        'Advanced: an array of {"mobiles": "91…", "VAR1": "…"} objects, one per message. Overrides Mobile numbers and Variables.',
    }),
    bool("shortUrl", "Shorten URLs", {
      hint: "Replace links in the message with MSG91 short URLs.",
    }),
    int("shortUrlExpiry", "Short URL expiry (seconds)", { hint: "Only used with Shorten URLs." }),
    bool("realTimeResponse", "Real-time response", {
      hint: "Ask MSG91 to surface most error codes in the response itself instead of caching.",
    }),
  ],
  output: [
    { key: "requestId", type: "string", label: "Request ID" },
    { key: "recipientCount", type: "number", label: "Recipients submitted" },
  ],

  async execute(input, ctx) {
    const templateId = requireStr("templateId", input.templateId);
    let recipients: Record<string, unknown>[];
    if (input.recipients !== undefined && input.recipients !== null && input.recipients !== "") {
      const parsed = parseJsonField("recipients", input.recipients);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new Error("recipients must be a non-empty JSON array");
      }
      recipients = parsed.map((r, i) => {
        const rec = { ...(r as Record<string, unknown>) };
        rec.mobiles = normalizeMobile(`recipients[${i}].mobiles`, rec.mobiles);
        return rec;
      });
    } else {
      const numbers = parseList("mobiles", input.mobiles);
      if (numbers.length === 0) throw new Error("mobiles or recipients is required");
      const vars = (parseJsonField("variables", input.variables) ?? {}) as Record<string, unknown>;
      recipients = numbers.map((n) => ({ ...vars, mobiles: normalizeMobile("mobiles", n) }));
    }

    const body: Record<string, unknown> = {
      template_id: templateId,
      ...pick(
        {
          short_url: input.shortUrl === undefined ? undefined : input.shortUrl ? "1" : "0",
          short_url_expiry: input.shortUrlExpiry,
          realTimeResponse: input.realTimeResponse ? "1" : undefined,
        },
        ["short_url", "short_url_expiry", "realTimeResponse"],
      ),
      recipients,
    };
    ctx.log("info", "msg91 sms-send", { templateId, recipients: recipients.length });
    const res = await call(ctx, "POST", "/flow", { body });
    return { requestId: res.message ?? null, recipientCount: recipients.length };
  },
};

export default smsSend;
