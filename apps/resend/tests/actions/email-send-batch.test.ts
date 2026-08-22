import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/email-send-batch.ts";

const display = {};

Deno.test("email-send-batch: sends the bare array Resend's schema declares", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [{ id: "re_1" }] } }], { display });
  await action.execute!({
    emails: '[{"from":"a@b.com","to":"x@y.com","subject":"Hi","html":"<p>Hi</p>"}]',
  }, ctx);
  assertEquals(calls[0].url, "https://api.resend.com/emails/batch");
  assertEquals(JSON.parse(calls[0].body!), [
    { from: "a@b.com", to: "x@y.com", subject: "Hi", html: "<p>Hi</p>" },
  ]);
});

Deno.test("email-send-batch: carries an idempotency key too", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], { display });
  (ctx as { invocation?: unknown }).invocation = { invocationId: "inv_xyz" };
  await action.execute!({ emails: '[{"from":"a@b.com"}]' }, ctx);
  assertEquals(calls[0].headers["idempotency-key"], "inv_xyz");
});

Deno.test("email-send-batch: Resend's 100-email cap is enforced by name", async () => {
  const { ctx, calls } = mockCtx([], { display });
  const many = JSON.stringify(Array.from({ length: 101 }, () => ({ from: "a@b.com" })));
  await assertRejects(
    async () => await action.execute!({ emails: many }, ctx),
    Error,
    "at most 100 emails per batch",
  );
  assertEquals(calls.length, 0);
});

Deno.test("email-send-batch: an empty or malformed array is rejected first", async () => {
  const empty = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ emails: "[]" }, empty.ctx),
    Error,
    "emails",
  );
  const bad = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ emails: "{oops" }, bad.ctx),
    Error,
    "JSON",
  );
  assertEquals(empty.calls.length + bad.calls.length, 0);
});
