import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import {
  API_HOSTS,
  baseUrl,
  compact,
  DEFAULT_ENVIRONMENT,
  environment,
  environmentFromConnection,
  hostForEnvironment,
  hostFromConnection,
  idempotencyKey,
  jsonObject,
  money,
  SQUARE_VERSION,
  SquareClient,
  unset,
} from "../../lib/client.ts";
import type { HookContext, RedactedConnection } from "@w6w/types";
import { INVOCATION_ID, mockCtx } from "../_helpers.ts";

// ---------------------------------------------------------------- version --

Deno.test("client: the pinned Square-Version is a YYYY-MM-DD date string", () => {
  assert(/^\d{4}-\d{2}-\d{2}$/.test(SQUARE_VERSION), SQUARE_VERSION);
  // Guards against an accidental edit: this is the version verified against
  // Square's own OpenAPI document and release notes on 2026-08-03.
  assertEquals(SQUARE_VERSION, "2026-07-15");
});

Deno.test("client: sends Square-Version on every request, GET and POST alike", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }, { body: {} }]);
  const client = new SquareClient(ctx);
  await client.request("/locations");
  await client.request("/customers", { body: { given_name: "Ada" } });
  assertEquals(calls[0].headers["square-version"], SQUARE_VERSION);
  assertEquals(calls[1].headers["square-version"], SQUARE_VERSION);
});

Deno.test("client: never sets an Authorization header — sign does that", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new SquareClient(ctx).request("/locations");
  assertEquals(calls[0].headers["authorization"], undefined);
});

// ------------------------------------------------------------ environment --

Deno.test("client: environment normalises to production unless explicitly sandbox", () => {
  assertEquals(environment("sandbox"), "sandbox");
  assertEquals(environment("production"), "production");
  assertEquals(environment(undefined), DEFAULT_ENVIRONMENT);
  assertEquals(environment("nonsense"), "production");
  assertEquals(DEFAULT_ENVIRONMENT, "production");
});

Deno.test("client: each environment maps to its documented host", () => {
  assertEquals(API_HOSTS.production, "connect.squareup.com");
  assertEquals(API_HOSTS.sandbox, "connect.squareupsandbox.com");
  assertEquals(hostForEnvironment("sandbox"), "connect.squareupsandbox.com");
  assertEquals(hostForEnvironment(undefined), "connect.squareup.com");
  assertEquals(baseUrl("connect.squareup.com"), "https://connect.squareup.com/v2");
});

Deno.test("client: reads the environment off the redacted connection display", () => {
  const conn = (display: Record<string, unknown>) => ({ display }) as unknown as RedactedConnection;
  assertEquals(environmentFromConnection(undefined), "production");
  assertEquals(environmentFromConnection(conn({})), "production");
  assertEquals(environmentFromConnection(conn({ environment: "sandbox" })), "sandbox");
  assertEquals(hostFromConnection(conn({ environment: "sandbox" })), "connect.squareupsandbox.com");
  assertEquals(hostFromConnection(conn({ environment: "production" })), "connect.squareup.com");
});

Deno.test("client: the environment switch picks the host for real requests", async () => {
  const prod = mockCtx([{ body: {} }]);
  await new SquareClient(prod.ctx).request("/locations");
  assertEquals(prod.calls[0].url, "https://connect.squareup.com/v2/locations");

  const sandbox = mockCtx([{ body: {} }], { display: { environment: "sandbox" } });
  await new SquareClient(sandbox.ctx).request("/locations");
  assertEquals(sandbox.calls[0].url, "https://connect.squareupsandbox.com/v2/locations");
  assertEquals(new SquareClient(sandbox.ctx).host, "connect.squareupsandbox.com");
});

// ---------------------------------------------------------------- request --

Deno.test("client: drops empty query params and stringifies the rest", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new SquareClient(ctx).request("/payments", {
    query: { limit: 5, cursor: "", location_id: undefined, count: false, total: 0 },
  });
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("limit"), "5");
  assertEquals(url.searchParams.get("count"), "false");
  assertEquals(url.searchParams.get("total"), "0");
  assertEquals(url.searchParams.has("cursor"), false);
  assertEquals(url.searchParams.has("location_id"), false);
});

Deno.test("client: a body implies POST and a JSON content type", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new SquareClient(ctx).request("/customers", { body: { given_name: "Ada", note: "" } });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), { given_name: "Ada" });
});

Deno.test("client: an explicit method overrides the body default", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new SquareClient(ctx).request("/customers/c1", { method: "PUT", body: { note: "x" } });
  assertEquals(calls[0].method, "PUT");
});

Deno.test("client: surfaces every entry of Square's error envelope", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: {
      errors: [
        { category: "INVALID_REQUEST_ERROR", code: "MISSING_REQUIRED_PARAMETER", field: "amount" },
        { category: "INVALID_REQUEST_ERROR", code: "VALUE_TOO_LOW", detail: "too small" },
      ],
    },
  }]);
  const err = await assertRejects(() => new SquareClient(ctx).request("/payments"));
  const message = (err as Error).message;
  assert(message.includes("Square 400"), message);
  assert(message.includes("MISSING_REQUIRED_PARAMETER"), message);
  assert(message.includes("(amount)"), message);
  assert(message.includes("VALUE_TOO_LOW"), message);
  assert(message.includes("too small"), message);
});

Deno.test("client: falls back to the raw body when a failure is not JSON", async () => {
  const { ctx } = mockCtx([{ status: 502, body: "<html>bad gateway</html>", headers: {} }]);
  const err = await assertRejects(() => new SquareClient(ctx).request("/locations"));
  assert((err as Error).message.includes("bad gateway"), (err as Error).message);
});

Deno.test("client: an empty 2xx body resolves to undefined rather than throwing", async () => {
  const { ctx } = mockCtx([{ status: 200, body: undefined }]);
  assertEquals(await new SquareClient(ctx).request("/locations"), undefined);
});

// ----------------------------------------------------------- idempotency --

Deno.test("idempotencyKey: defaults to the host's invocation id", () => {
  const { ctx } = mockCtx([]);
  assertEquals(idempotencyKey(ctx, undefined, 45), INVOCATION_ID);
  assertEquals(idempotencyKey(ctx, "", 45), INVOCATION_ID);
  assertEquals(idempotencyKey(ctx, "   ", 45), INVOCATION_ID);
});

Deno.test("idempotencyKey: an explicit override wins", () => {
  const { ctx } = mockCtx([]);
  assertEquals(idempotencyKey(ctx, " my-key ", 45), "my-key");
});

Deno.test("idempotencyKey: throws rather than inventing a random key", () => {
  const ctx = { fetch: (() => {}) as unknown as typeof fetch, log: () => {} } as HookContext;
  assertThrows(
    () => idempotencyKey(ctx, undefined, 45),
    Error,
    "no invocation id",
  );
});

Deno.test("idempotencyKey: rejects an over-long key rather than truncating it", () => {
  const { ctx } = mockCtx([]);
  assertThrows(
    () => idempotencyKey(ctx, "x".repeat(46), 45),
    Error,
    "45 characters",
  );
  // The default invocation id must fit inside Square's tightest limit.
  assert(INVOCATION_ID.length <= 45);
});

// ------------------------------------------------------------- utilities --

Deno.test("compact: drops undefined, null, blank strings and empty arrays", () => {
  assertEquals(
    compact({ a: 1, b: undefined, c: null, d: "", e: [], f: false, g: 0, h: ["x"] }),
    { a: 1, f: false, g: 0, h: ["x"] },
  );
});

Deno.test("unset: turns a blank string into undefined", () => {
  assertEquals(unset(""), undefined);
  assertEquals(unset("x"), "x");
  assertEquals(unset(undefined), undefined);
});

Deno.test("money: builds Square's minor-unit Money object and upper-cases the currency", () => {
  assertEquals(money(1000, "usd"), { amount: 1000, currency: "USD" });
  assertEquals(money(undefined, "USD"), undefined);
  assertEquals(money(0, "JPY"), { amount: 0, currency: "JPY" });
  assertThrows(() => money(100, undefined), Error, "currency is required");
});

Deno.test("jsonObject: parses a string, passes an object, rejects an array", () => {
  assertEquals(jsonObject('{"a":1}', "address"), { a: 1 });
  assertEquals(jsonObject({ a: 1 }, "address"), { a: 1 });
  assertEquals(jsonObject("", "address"), undefined);
  assertEquals(jsonObject({}, "address"), undefined);
  assertThrows(() => jsonObject("[1,2]", "address"), Error, "must be a JSON object");
});
