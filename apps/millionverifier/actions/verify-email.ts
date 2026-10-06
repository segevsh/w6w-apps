import type { ActionDefinition } from "@w6w/types";
import { MillionVerifierClient, required } from "../lib/client.ts";

interface Input {
  email: string;
  timeout?: number;
}

/**
 * `GET /api/v3/?email=…&timeout=…`. Spends one credit. Every outcome, including a bad key,
 * is HTTP 200; the client throws on a non-empty `error`. `result: "error"` with an empty
 * `error` is a verification outcome (the vendor could not decide), returned as data.
 */
const verifyEmail: ActionDefinition<Input> = {
  key: "verify-email",
  type: "read",
  resource: "email",
  title: "Verify Email",
  description: "Verify one email address in real time. Spends one credit. Returns the result " +
    "(ok, catch_all, unknown, error, disposable, invalid), quality, subresult, free/role flags, " +
    "a did-you-mean correction and the credits left.",
  params: [
    { key: "email", label: "Email", type: "string", required: true },
    {
      key: "timeout",
      label: "Timeout (seconds)",
      type: "number",
      validation: { min: 2, max: 60, integer: true },
      hint: "How long to wait on the recipient's mail server, 2 to 60. The vendor default is 20.",
    },
  ],
  output: [
    { key: "email", type: "string", label: "Verified address" },
    { key: "result", type: "string", label: "ok, catch_all, unknown, error, disposable, invalid" },
    {
      key: "resultCode",
      type: "number",
      label: "1 ok, 2 catch_all, 3 unknown, 4 error, 5 disposable, 6 invalid",
    },
    { key: "quality", type: "string", label: "good, bad or risky (empty when undecided)" },
    { key: "subresult", type: "string", label: "Detailed reason, e.g. mailbox_full" },
    { key: "free", type: "boolean", label: "Free provider (Gmail, Yahoo, ...)" },
    { key: "role", type: "boolean", label: "Role account (admin@, sales@, ...)" },
    { key: "didYouMean", type: "string", label: "Typo correction suggestion" },
    { key: "credits", type: "number", label: "Credits left" },
    { key: "executionTime", type: "number", label: "Milliseconds the check took" },
    { key: "liveMode", type: "boolean", label: "False for the test key" },
  ],

  async execute(input, ctx) {
    const email = required(input.email, "email");
    if (input.timeout !== undefined && input.timeout !== null) {
      const t = Number(input.timeout);
      if (!Number.isInteger(t) || t < 2 || t > 60) {
        throw new Error("timeout must be a whole number of seconds between 2 and 60");
      }
    }
    const { body } = await new MillionVerifierClient(ctx).request("/api/v3/", {
      api: "single",
      query: { email, timeout: input.timeout },
    });
    const b = (body ?? {}) as Record<string, unknown>;
    return {
      email: b.email,
      result: b.result,
      resultCode: b.resultcode,
      quality: b.quality === "" ? undefined : b.quality,
      subresult: b.subresult === "" ? undefined : b.subresult,
      free: b.free,
      role: b.role,
      didYouMean: b.didyoumean === "" ? undefined : b.didyoumean,
      credits: b.credits,
      executionTime: b.executiontime,
      liveMode: b.livemode,
    };
  },
};

export default verifyEmail;
