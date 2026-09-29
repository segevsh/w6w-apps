import { assertEquals } from "@std/assert";
import verifyEmail from "../../actions/verify-email.ts";
import { mockCtx, pathOf, queryOf, withCredits } from "../_helpers.ts";

const VERIFY_RESULT = {
  email: "test@example.com",
  domain: "example.com",
  reachable: "risky",
  disposable: false,
  roleAccount: true,
  mxValid: true,
  connection: true,
  inboxFull: false,
  catchAll: false,
  deliverable: true,
  disabled: false,
  syntaxValid: true,
};

Deno.test("verify-email: builds the request against /v2/verify/?email=", async () => {
  const { ctx, calls } = mockCtx([withCredits(VERIFY_RESULT, 1, 998)]);
  const out = await verifyEmail.execute({ email: "test@example.com" }, ctx) as
    & typeof VERIFY_RESULT
    & { creditsSpent: number; creditsRemaining: number };

  assertEquals(pathOf(calls[0].url), "/v2/verify/");
  assertEquals(queryOf(calls[0].url), { email: "test@example.com" });
  assertEquals(out.email, VERIFY_RESULT.email);
  assertEquals(out.reachable, "risky");
  assertEquals(out.roleAccount, true);
  assertEquals(out.disposable, false);
  assertEquals(out.creditsSpent, 1);
  assertEquals(out.creditsRemaining, 998);
});

Deno.test("verify-email: every documented VerifyResult field is declared in output", () => {
  const keys = (verifyEmail.output as { key: string }[]).map((f) => f.key);
  for (const field of Object.keys(VERIFY_RESULT)) {
    assertEquals(keys.includes(field), true, `missing output field: ${field}`);
  }
});

Deno.test("verify-email: email is required", () => {
  const emailParam = verifyEmail.params?.find((p) => p.key === "email");
  assertEquals(emailParam?.required, true);
});
