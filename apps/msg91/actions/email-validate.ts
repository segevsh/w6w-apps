import type { ActionDefinition } from "@w6w/types";
import { call, requireStr } from "../lib/client.ts";
import { str } from "../lib/params.ts";

type Input = Record<string, unknown>;

const emailValidate: ActionDefinition<Input> = {
  key: "email-validate",
  type: "read",
  resource: "email",
  title: "Validate Email",
  description:
    "Check whether an email address is deliverable, disposable, a free-mail or a role address.",
  params: [str("email", "Email address", { required: true })],
  output: [
    { key: "valid", type: "boolean", label: "Valid" },
    { key: "result", type: "string", label: "Verdict (e.g. deliverable)" },
    { key: "reason", type: "string", label: "Reason" },
    { key: "isDisposable", type: "boolean", label: "Disposable domain" },
    { key: "isFree", type: "boolean", label: "Free-mail provider" },
    { key: "isRole", type: "boolean", label: "Role address (info@, sales@)" },
  ],

  async execute(input, ctx) {
    const res = await call(ctx, "POST", "/email/validate", {
      body: { email: requireStr("email", input.email) },
    });
    const r = ((res.data as Record<string, unknown> | undefined)?.result ?? {}) as Record<
      string,
      unknown
    >;
    return {
      valid: r.valid ?? null,
      result: r.result ?? null,
      reason: r.reason ?? null,
      isDisposable: r.is_disposable ?? null,
      isFree: r.is_free ?? null,
      isRole: r.is_role ?? null,
    };
  },
};

export default emailValidate;
