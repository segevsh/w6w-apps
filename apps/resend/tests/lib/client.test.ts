import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { addresses, API_URL, compact, json, ResendClient } from "../../lib/client.ts";

const page = (data: unknown[], has_more = false) => ({ object: "list", has_more, data });

Deno.test("compact: drops unset keys and empty arrays, keeps false and zero", () => {
  assertEquals(compact({ a: 1, b: undefined, c: null, d: "", e: false, f: 0, g: [] }), {
    a: 1,
    e: false,
    f: 0,
  });
});

/**
 * Resend types `to`/`cc`/`bcc`/`reply_to` as oneOf string | string[], so one
 * address goes as a bare string and several as an array — the shape its own
 * examples use.
 */
Deno.test("addresses: one address stays a string, several become an array", () => {
  assertEquals(addresses("a@b.com", "to"), "a@b.com");
  assertEquals(addresses("a@b.com, c@d.com", "to"), ["a@b.com", "c@d.com"]);
  assertEquals(addresses(["a@b.com"], "to"), "a@b.com");
  assertEquals(addresses(["a@b.com", "c@d.com"], "to"), ["a@b.com", "c@d.com"]);
  assertEquals(addresses("", "to"), undefined);
  assertEquals(addresses(undefined, "to"), undefined);
});

Deno.test("addresses: the schema's 50-recipient cap is enforced by name", () => {
  const many = Array.from({ length: 51 }, (_, i) => `u${i}@example.com`).join(",");
  const err = assertThrows(() => addresses(many, "to", 50), Error);
  assert(err.message.includes("at most 50"), err.message);
  assert(err.message.includes("`to`"), err.message);
});

Deno.test("json: parses a string param and names a bad one", () => {
  assertEquals(json('{"a":1}', "headers"), { a: 1 });
  assertEquals(json({ a: 1 }, "headers"), { a: 1 });
  assertEquals(json("", "headers"), undefined);
  const err = assertThrows(() => json("{oops", "attachments"), Error);
  assert(err.message.includes("attachments"), err.message);
});

Deno.test("client: never sends an Authorization header — signing is the host's job", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], { display: {} });
  await new ResendClient(ctx).request("/emails");
  assertEquals(calls[0].url, `${API_URL}/emails`);
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].headers["accept"], "application/json");
});

Deno.test("client: the idempotency key rides as a header, not a body field", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], { display: {} });
  await new ResendClient(ctx).request("/emails", {
    method: "POST",
    body: { subject: "hi" },
    idempotencyKey: "inv_123",
  });
  assertEquals(calls[0].headers["idempotency-key"], "inv_123");
  assertEquals(JSON.parse(calls[0].body!), { subject: "hi" });
});

Deno.test("client: a bare array body is sent as-is, for the batch endpoint", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [] } }], { display: {} });
  await new ResendClient(ctx).request("/emails/batch", { method: "POST", body: [{ a: 1 }] });
  assertEquals(JSON.parse(calls[0].body!), [{ a: 1 }]);
});

Deno.test("client: a failure surfaces the status and Resend's own error body", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: { statusCode: 422, message: "from is invalid", name: "validation_error" },
  }], { display: {} });
  const err = await assertRejects(
    async () => await new ResendClient(ctx).request("/emails", { method: "POST", body: {} }),
    Error,
  );
  assert(err.message.includes("422"), err.message);
  assert(err.message.includes("validation_error"), err.message);
});

Deno.test("client: requestAll pages with the last item's id as the cursor", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: page([{ id: "e1" }, { id: "e2" }], true) },
    { status: 200, body: page([{ id: "e3" }], false) },
  ], { display: {} });

  const items = await new ResendClient(ctx).requestAll("/emails");
  assertEquals(items, [{ id: "e1" }, { id: "e2" }, { id: "e3" }]);
  assertEquals(new URL(calls[0].url).searchParams.get("after"), null);
  assertEquals(new URL(calls[0].url).searchParams.get("limit"), "100");
  // `after` takes the id of the last item on the previous page.
  assertEquals(new URL(calls[1].url).searchParams.get("after"), "e2");
});

Deno.test("client: a response with no has_more ends the loop rather than spinning", async () => {
  // /audiences and /contacts answer { object, data } with no has_more.
  const { ctx, calls } = mockCtx(
    [{ status: 200, body: { object: "list", data: [{ id: "a1" }] } }],
    {
      display: {},
    },
  );
  assertEquals(await new ResendClient(ctx).requestAll("/audiences"), [{ id: "a1" }]);
  assertEquals(calls.length, 1);
});

Deno.test("client: requestAll stops at wantTotal even with more waiting", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: page([{ id: "1" }, { id: "2" }, { id: "3" }], true) },
  ], { display: {} });
  assertEquals(await new ResendClient(ctx).requestAll("/emails", {}, 2), [
    { id: "1" },
    { id: "2" },
  ]);
  assertEquals(calls.length, 1);
});
