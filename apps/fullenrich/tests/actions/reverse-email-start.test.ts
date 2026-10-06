import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/reverse-email-start.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("reverse-email-start: single email posts one record", async () => {
  const { ctx, calls } = mockCtx([{ body: { enrichment_id: "r1" } }]);
  const out = await action.execute!({
    name: "R",
    email: "john@example.com",
    custom: { user_id: "1" },
    webhookUrl: "https://example.com/hook",
  }, ctx);
  assertEquals(out, { enrichmentId: "r1" });
  assertEquals(calls[0].url, "https://app.fullenrich.com/api/v2/contact/reverse/email/bulk");
  assertEquals(JSON.parse(calls[0].body!), {
    name: "R",
    webhook_url: "https://example.com/hook",
    data: [{ email: "john@example.com", custom: { user_id: "1" } }],
  });
});

Deno.test("reverse-email-start: bulk emails override the single field; silentFail is a query flag", async () => {
  const { ctx, calls } = mockCtx([{ body: { enrichment_id: "r2" } }]);
  await action.execute!({
    name: "R",
    email: "ignored@x.com",
    silentFail: true,
    emails: '[{"email":"a@a.com"},{"email":"b@b.com"}]',
  }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("silentFail"), "true");
  assertEquals(JSON.parse(calls[0].body!).data, [{ email: "a@a.com" }, { email: "b@b.com" }]);
});

Deno.test("reverse-email-start: vendor errors are thrown", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: { code: "error.reverse.email.invalid", message: "Email is invalid" },
  }]);
  await assertRejects(
    async () => await action.execute!({ name: "R", email: "bad" }, ctx),
    Error,
    "Email is invalid",
  );
});
