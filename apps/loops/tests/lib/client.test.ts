import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import {
  API_URL,
  compact,
  contactIdentity,
  csv,
  idempotencyHeader,
  json,
  LoopsClient,
  mailingListSubscriptions,
  mergeCustomProperties,
} from "../../lib/client.ts";
import { mockCtx } from "../_helpers.ts";

/** The base is `/api` and every path carries its own `/v1`. */
Deno.test("the API base is what the spec's servers block plus the paths give", () => {
  assertEquals(API_URL, "https://app.loops.so/api/v1");
});

Deno.test("compact / csv / json behave as the actions expect", () => {
  assertEquals(compact({ a: 1, b: "", c: null, d: undefined, e: [], f: false }), {
    a: 1,
    f: false,
  });
  assertEquals(csv("a, b ,,c"), ["a", "b", "c"]);
  assertEquals(json('{"a":1}', "x"), { a: 1 });
  assertThrows(() => json("{oops", "dataVariables"), Error, "`dataVariables` is not valid JSON");
});

/** Naming neither identity is the mistake that silently forks a contact. */
Deno.test("contactIdentity requires one of email or userId", () => {
  assertEquals(contactIdentity("ada@example.com", "", "x"), { email: "ada@example.com" });
  assertEquals(contactIdentity("", "u1", "x"), { userId: "u1" });
  assertEquals(contactIdentity("ada@example.com", "u1", "x"), {
    email: "ada@example.com",
    userId: "u1",
  });
  assertThrows(() => contactIdentity("", "", "`contact-find`"), Error, "`contact-find` needs");
});

/**
 * Loops takes `{listId: boolean}`. An array is ignored rather than rejected,
 * so the conversion has to happen here.
 */
Deno.test("mailingListSubscriptions turns a comma list into an add-to-all object", () => {
  assertEquals(mailingListSubscriptions("l1, l2"), { l1: true, l2: true });
  assertEquals(mailingListSubscriptions(""), undefined);
});

Deno.test("mailingListSubscriptions passes an object through, so removals work", () => {
  assertEquals(mailingListSubscriptions('{"l1":true,"l2":false}'), { l1: true, l2: false });
});

Deno.test("mailingListSubscriptions refuses a value that is not a boolean", () => {
  assertThrows(
    () => mailingListSubscriptions('{"l1":"yes"}'),
    Error,
    'mailing list "l1" must map to true (add) or false (remove)',
  );
});

/** Custom properties live at the TOP level of the contact, beside firstName. */
Deno.test("mergeCustomProperties merges into the body rather than nesting", () => {
  const body: Record<string, unknown> = { email: "ada@example.com" };
  mergeCustomProperties(body, '{"plan":"pro","seats":12,"trialing":false}');
  assertEquals(body, { email: "ada@example.com", plan: "pro", seats: 12, trialing: false });
});

/** A custom property named `email` would overwrite the identity of the call. */
Deno.test("mergeCustomProperties refuses to shadow a built-in field", () => {
  for (const key of ["email", "userId", "firstName", "subscribed", "mailingLists"]) {
    assertThrows(
      () => mergeCustomProperties({}, `{"${key}":"x"}`),
      Error,
      `may not contain "${key}"`,
    );
  }
});

Deno.test("mergeCustomProperties refuses a type Loops does not accept", () => {
  assertThrows(
    () => mergeCustomProperties({}, '{"tags":["a","b"]}'),
    Error,
    "Loops accepts only strings, numbers and booleans",
  );
  assertThrows(() => mergeCustomProperties({}, '"nope"'), Error, "must be a JSON object");
});

Deno.test("mergeCustomProperties leaves the body alone when nothing is set", () => {
  const body = { email: "a@x.com" };
  assertEquals(mergeCustomProperties({ ...body }, ""), body);
});

/**
 * The invocation id is stable across a retry of the same step and different for
 * the next one — which is exactly what Loops' key wants.
 */
Deno.test("idempotencyHeader derives the key from the invocation, opt-in only", () => {
  const { ctx } = mockCtx();
  (ctx as { invocation?: unknown }).invocation = { invocationId: "inv1" };
  assertEquals(idempotencyHeader(ctx, true), { "Idempotency-Key": "w6w-inv1" });
  // Off by default: without the opt-in nothing is sent.
  assertEquals(idempotencyHeader(ctx, false), undefined);
  assertEquals(idempotencyHeader(ctx, undefined), undefined);
});

Deno.test("idempotencyHeader stays inside Loops' 100-character limit", () => {
  const { ctx } = mockCtx();
  (ctx as { invocation?: unknown }).invocation = { invocationId: "x".repeat(300) };
  const key = idempotencyHeader(ctx, true)!["Idempotency-Key"];
  assertEquals(key.length, 100);
});

Deno.test("idempotencyHeader sends nothing when there is no invocation to key on", () => {
  const { ctx } = mockCtx();
  assertEquals(idempotencyHeader(ctx, true), undefined);
});

Deno.test("client: builds paths under the v1 base", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { success: true } }]);
  await new LoopsClient(ctx).request("/contacts/find", { query: { email: "a@x.com" } });
  assertEquals(calls[0].url, "https://app.loops.so/api/v1/contacts/find?email=a%40x.com");
});

Deno.test("client: never sends Authorization — signing is the host's job", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await new LoopsClient(ctx).request("/api-key");
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("client: extra headers reach the wire", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await new LoopsClient(ctx).request("/transactional", {
    method: "POST",
    body: {},
    headers: { "Idempotency-Key": "k1" },
  });
  assertEquals(calls[0].headers["idempotency-key"], "k1");
});

Deno.test("client: a failure surfaces the status and Loops' envelope", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    statusText: "Unauthorized",
    body: { success: false, message: "Invalid API key", error: "Invalid API key" },
  }]);
  const err = await assertRejects(
    async () => await new LoopsClient(ctx).request("/api-key"),
    Error,
  );
  assert(err.message.includes("401"), err.message);
  assert(err.message.includes("Invalid API key"), err.message);
});

/** `nextCursor` is null on the last page rather than absent. */
Deno.test("requestAll follows the cursor until it is null", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { data: [{ id: "a" }], pagination: { nextCursor: "c2" } } },
    { status: 200, body: { data: [{ id: "b" }], pagination: { nextCursor: null } } },
  ]);
  assertEquals(await new LoopsClient(ctx).requestAll("/campaigns"), [{ id: "a" }, { id: "b" }]);
  assertEquals(new URL(calls[1].url).searchParams.get("cursor"), "c2");
});

Deno.test("requestAll asks for no more than it wants, capped at Loops' 50", async () => {
  const small = mockCtx([{ status: 200, body: { data: [], pagination: {} } }]);
  await new LoopsClient(small.ctx).requestAll("/campaigns", {}, 5);
  assertEquals(new URL(small.calls[0].url).searchParams.get("perPage"), "5");

  const big = mockCtx([{ status: 200, body: { data: [], pagination: {} } }]);
  await new LoopsClient(big.ctx).requestAll("/campaigns", {}, Infinity);
  assertEquals(new URL(big.calls[0].url).searchParams.get("perPage"), "50");
});

Deno.test("requestAll stops at the wanted total", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { data: [{ id: "a" }, { id: "b" }, { id: "c" }], pagination: { nextCursor: "c2" } },
  }]);
  assertEquals((await new LoopsClient(ctx).requestAll("/campaigns", {}, 3)).length, 3);
  assertEquals(calls.length, 1);
});
