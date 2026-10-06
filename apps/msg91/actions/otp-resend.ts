import type { ActionDefinition } from "@w6w/types";
import { call, normalizeMobile } from "../lib/client.ts";
import { select, str } from "../lib/params.ts";

type Input = Record<string, unknown>;

const otpResend: ActionDefinition<Input> = {
  key: "otp-resend",
  type: "perform",
  resource: "otp",
  title: "Resend OTP",
  description:
    "Resend the same OTP to the number it was first sent to, by text or voice call (MSG91 allows 2 retries).",
  idempotent: false,
  params: [
    str("mobile", "Mobile number", {
      required: true,
      hint: "International format with country code; an OTP must already have been sent to it.",
    }),
    select("retryType", "Channel", ["text", "voice"], {
      default: "text",
      hint: "MSG91's own default is voice; this action defaults to text.",
    }),
  ],
  output: [{ key: "message", type: "string", label: "MSG91's message" }],

  async execute(input, ctx) {
    const res = await call(ctx, "GET", "/otp/retry", {
      query: {
        mobile: normalizeMobile("mobile", input.mobile),
        retrytype: input.retryType === "voice" ? "voice" : "text",
      },
    });
    return { message: res.message ?? null };
  },
};

export default otpResend;
