import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/check-email.ts";

Deno.test("check-email: POSTs /v1/singleEmail:check with the email body and returns the result verbatim", async () => {
  const body = {
    email: "a@example.com",
    trustRate: 92,
    mxExists: true,
    smtpExists: true,
    isNotSmtpCatchAll: true,
    isNotDisposable: true,
  };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({ email: "a@example.com" }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://api.mailcheck.co");
  assertEquals(url.pathname, "/v1/singleEmail:check");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { email: "a@example.com" });
  assertEquals(result, body);
});

Deno.test("check-email: is a read action scoped to the email resource", () => {
  assertEquals(action.type, "read");
  assertEquals(action.resource, "email");
  assertEquals(action.params?.find((p) => p.key === "email")?.required, true);
});
