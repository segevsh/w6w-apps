import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/email-send.ts";

const display = {};

Deno.test("email-send: posts the email and returns its id", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "re_1" } }], { display });
  const result = await action.execute!({
    from: "Acme <hello@example.com>",
    to: "a@b.com",
    subject: "Hi",
    html: "<p>Hi</p>",
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.resend.com/emails");
  assertEquals(JSON.parse(calls[0].body!), {
    from: "Acme <hello@example.com>",
    to: "a@b.com",
    subject: "Hi",
    html: "<p>Hi</p>",
  });
  assertEquals(result, { id: "re_1" });
});

Deno.test("email-send: several recipients become an array, one stays a string", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], { display });
  await action.execute!({
    from: "a@b.com",
    to: "x@y.com, z@y.com",
    cc: "c@y.com",
    subject: "Hi",
    text: "hi",
  }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.to, ["x@y.com", "z@y.com"]);
  assertEquals(body.cc, "c@y.com");
});

/** The idempotency key is what makes `idempotent: true` honest. */
Deno.test("email-send: defaults the idempotency key to the invocation id", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], { display });
  (ctx as { invocation?: unknown }).invocation = { invocationId: "inv_abc" };
  await action.execute!({ from: "a@b.com", to: "x@y.com", subject: "Hi", text: "hi" }, ctx);
  assertEquals(calls[0].headers["idempotency-key"], "inv_abc");
});

Deno.test("email-send: an explicit key overrides the invocation id", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], { display });
  (ctx as { invocation?: unknown }).invocation = { invocationId: "inv_abc" };
  await action.execute!({
    from: "a@b.com",
    to: "x@y.com",
    subject: "Hi",
    text: "hi",
    idempotencyKey: "mine",
  }, ctx);
  assertEquals(calls[0].headers["idempotency-key"], "mine");
});

Deno.test("email-send: an email with no body is caught before the request", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ from: "a@b.com", to: "x@y.com", subject: "Hi" }, ctx),
    Error,
    "an email needs a body",
  );
  assertEquals(calls.length, 0);
});

Deno.test("email-send: from, to and subject are each required", async () => {
  for (
    const [patch, needle] of [
      [{ to: "x@y.com", subject: "s", text: "t" }, "`from`"],
      [{ from: "a@b.com", subject: "s", text: "t" }, "`to`"],
      [{ from: "a@b.com", to: "x@y.com", text: "t" }, "`subject`"],
    ] as const
  ) {
    const { ctx, calls } = mockCtx([], { display });
    await assertRejects(async () => await action.execute!(patch, ctx), Error, needle);
    assertEquals(calls.length, 0);
  }
});

Deno.test("email-send: more than 50 recipients is caught here, not by a 422", async () => {
  const { ctx, calls } = mockCtx([], { display });
  const many = Array.from({ length: 51 }, (_, i) => `u${i}@example.com`).join(",");
  await assertRejects(
    async () => await action.execute!({ from: "a@b.com", to: many, subject: "s", text: "t" }, ctx),
    Error,
    "at most 50",
  );
  assertEquals(calls.length, 0);
});
