import type { ActionDefinition } from "@w6w/types";
import { MemberstackClient } from "../lib/client.ts";

/**
 * `POST /members/verify-token`. Any token problem (bad signature, expired, wrong audience,
 * malformed, missing) answers `400 {"code":"INVALID_TOKEN","message":"Invalid token"}`; this
 * action reports that as `valid: false` rather than an error, because "this token is not good"
 * is the answer a workflow branches on. Every other failure (bad secret key, 429, 5xx) throws.
 *
 * `read`, not `perform`: it changes nothing.
 */
interface Input {
  token: string;
}

const memberVerifyToken: ActionDefinition<Input> = {
  key: "member-verify-token",
  type: "read",
  resource: "member",
  title: "Verify Member Token",
  description: "Verify a member's JWT and return its decoded payload, or valid: false.",
  params: [
    {
      key: "token",
      label: "Member token",
      type: "secret",
      required: true,
      hint: "The JWT a member's browser holds (the memberstack cookie / getMemberCookie()).",
    },
  ],
  output: [
    { key: "valid", type: "boolean", label: "Token is valid" },
    { key: "memberId", type: "string", label: "Member ID (token subject)" },
    {
      key: "payload",
      type: "object",
      label: "Decoded token payload (id, type, iat, exp, aud, iss)",
    },
  ],

  async execute(input, ctx) {
    const res = await new MemberstackClient(ctx).jsonOrCode<{ data?: { id?: string } }>(
      "/members/verify-token",
      { method: "POST", body: { token: input.token } },
      "INVALID_TOKEN",
    );
    if (!res.ok) return { valid: false, memberId: null, payload: null };
    const payload = res.body?.data ?? null;
    return { valid: true, memberId: payload?.id ?? null, payload };
  },
};

export default memberVerifyToken;
