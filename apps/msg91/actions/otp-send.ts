import type { ActionDefinition } from "@w6w/types";
import { call, normalizeMobile, parseJsonField, requireStr } from "../lib/client.ts";
import { bool, int, json, str } from "../lib/params.ts";

type Input = Record<string, unknown>;

const otpSend: ActionDefinition<Input> = {
  key: "otp-send",
  type: "perform",
  resource: "otp",
  title: "Send OTP",
  description:
    "Generate and send a one-time password by SMS from an MSG91 OTP template. MSG91 stores it for Verify OTP.",
  idempotent: false,
  params: [
    str("templateId", "OTP template ID", {
      required: true,
      hint: "From the OTP section of your MSG91 account.",
    }),
    str("mobile", "Mobile number", {
      required: true,
      hint: "International format with country code (919876543210).",
    }),
    str("otp", "OTP", {
      hint: "Supply your own code. Leave blank to let MSG91 generate one.",
    }),
    int("otpLength", "OTP length", { hint: "Digits when MSG91 generates it: 4 (default) to 9." }),
    int("otpExpiry", "OTP expiry (minutes)", {
      hint: "Default 15, minimum 1, maximum 10080 (7 days).",
    }),
    bool("unicode", "Unicode message", { hint: "Set for non-English template text." }),
    bool("invisible", "Invisible (mobile apps only)", {
      hint:
        "Mobile app flows only; auto-verifies when the number is on the device's mobile network.",
    }),
    bool("realTimeResponse", "Real-time response", {
      hint: "Surface most error codes in the response itself instead of caching.",
    }),
    json("variables", "Template variables", {
      hint: 'Extra template values as an object, e.g. {"Param1": "value1"}.',
    }),
  ],
  output: [{ key: "requestId", type: "string", label: "Request ID" }],

  async execute(input, ctx) {
    const flag = (v: unknown) => v === undefined || v === null ? undefined : v ? 1 : 0;
    const res = await call(ctx, "POST", "/otp", {
      query: {
        template_id: requireStr("templateId", input.templateId),
        mobile: normalizeMobile("mobile", input.mobile),
        otp: input.otp,
        otp_length: input.otpLength,
        otp_expiry: input.otpExpiry,
        unicode: flag(input.unicode),
        invisible: flag(input.invisible),
        realTimeResponse: input.realTimeResponse ? 1 : undefined,
      },
      body: parseJsonField("variables", input.variables) ?? {},
    });
    return { requestId: res.request_id ?? null };
  },
};

export default otpSend;
