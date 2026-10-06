import type { ActionDefinition } from "@w6w/types";
import { call, Msg91Error, normalizeMobile, requireStr } from "../lib/client.ts";
import { str } from "../lib/params.ts";

type Input = Record<string, unknown>;

/** The vendor's own "this OTP is not good" answers — a result, not a failure of the call. */
const MISMATCH = /otp (not match|expired)|already verified|invalid otp/i;

const otpVerify: ActionDefinition<Input> = {
  key: "otp-verify",
  type: "perform",
  resource: "otp",
  title: "Verify OTP",
  description:
    "Check an OTP the user typed against the one MSG91 sent. Returns verified true/false; a rejected key or bad input fails the step.",
  idempotent: false,
  params: [
    str("mobile", "Mobile number", {
      required: true,
      hint: "International format with country code, as used in Send OTP.",
    }),
    str("otp", "OTP", { required: true }),
  ],
  output: [
    { key: "verified", type: "boolean", label: "OTP accepted" },
    { key: "message", type: "string", label: "MSG91's message (e.g. OTP not match, OTP expired)" },
  ],

  async execute(input, ctx) {
    try {
      const res = await call(ctx, "GET", "/otp/verify", {
        query: {
          mobile: normalizeMobile("mobile", input.mobile),
          otp: requireStr("otp", input.otp),
        },
      });
      return { verified: res.type === "success", message: res.message ?? null };
    } catch (e) {
      if (e instanceof Msg91Error && e.vendorMessage && MISMATCH.test(e.vendorMessage)) {
        return { verified: false, message: e.vendorMessage };
      }
      throw e;
    }
  },
};

export default otpVerify;
