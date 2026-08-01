import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/validate-email.ts";

Deno.test("validate-email: GETs /email with the email query param and returns the full report", async () => {
  const body = {
    is_format_valid: true,
    is_domain_valid: true,
    domain_has_valid_mx_records: true,
    is_email_free: false,
    is_email_disposable: false,
    is_email_role: false,
    canonical: "peter@google.com",
    deliverability: "GOOD",
    safe_to_register_as_user: false,
    elapsed: 0.006,
  };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({ email: "test+safe@gmail.com" }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/email");
  assertEquals(url.searchParams.get("email"), "test+safe@gmail.com");
  assertEquals(result, body);
});
