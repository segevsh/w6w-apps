import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";
import { SQUARE_VERSION } from "../lib/client.ts";
import { mockCtx } from "./_helpers.ts";

/**
 * The smallest input that satisfies each action's required params. Used by the
 * two app-wide invariants below, which sweep every action rather than trusting
 * that each per-action test remembered to check them.
 */
const MINIMAL_INPUT: Record<string, Record<string, unknown>> = {
  "location-get-many": {},
  "location-get": { locationId: "L1" },
  "payment-get-many": {},
  "payment-get": { paymentId: "p1" },
  "payment-create": { sourceId: "cnon:x", amount: 100, currency: "USD" },
  "refund-get-many": {},
  "refund-get": { refundId: "r1" },
  "refund-create": { paymentId: "p1", amount: 100, currency: "USD" },
  "order-get": { orderId: "o1" },
  "order-search": {},
  "customer-get-many": {},
  "customer-get": { customerId: "c1" },
  "customer-create": { givenName: "Ada" },
  "customer-update": { customerId: "c1", note: "hi" },
  "catalog-get-many": {},
  "catalog-search-items": {},
  "invoice-get-many": { locationId: "L1" },
};

Deno.test("index: exposes exactly the expected action keys, each unique", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(keys.sort(), Object.keys(MINIMAL_INPUT).sort());
  assertEquals(new Set(keys).size, keys.length);
});

Deno.test("index: declares the access-token auth method", () => {
  assertEquals(app.auth?.map((a) => a.key), ["access-token"]);
});

Deno.test("index: declares the service and quota health checks", () => {
  assertEquals(app.healthChecks?.map((h) => h.key).sort(), ["quota", "service"]);
});

Deno.test("index: every action declares a type and a title", () => {
  for (const action of app.actions) {
    assert(["read", "search", "perform", "control"].includes(action.type));
    assert(action.title.length > 0, `${action.key} has no title`);
  }
});

Deno.test("index: every action declares a description and output fields", () => {
  for (const action of app.actions) {
    assert(action.description, `${action.key} declares no description`);
    assert(action.output, `${action.key} declares no output`);
  }
});

Deno.test("index: every perform action declares idempotent explicitly", () => {
  for (const action of app.actions) {
    if (action.type === "perform") {
      assertEquals(typeof action.idempotent, "boolean", `${action.key}`);
    }
  }
});

Deno.test("index: no action sets an auth header itself", () => {
  for (const action of app.actions) {
    assertEquals(
      /authorization|bearer/i.test(action.execute.toString()),
      false,
      `${action.key} mentions an auth header`,
    );
  }
});

/**
 * The load-bearing invariant of this app: Square pins the API contract to the
 * `Square-Version` request header, and an action that forgets it silently gets
 * whatever version the token's Developer Console application happens to default
 * to. So assert it on EVERY action, not only the ones a per-action test covers.
 */
Deno.test("index: every action sends Square-Version on every request", async () => {
  for (const action of app.actions) {
    const { ctx, calls } = mockCtx([{ body: {} }]);
    await action.execute(MINIMAL_INPUT[action.key] as never, ctx);
    assertEquals(calls.length, 1, `${action.key} made ${calls.length} requests`);
    assertEquals(
      calls[0].headers["square-version"],
      SQUARE_VERSION,
      `${action.key} did not send Square-Version`,
    );
    assertEquals(
      calls[0].headers["accept"],
      "application/json",
      `${action.key} did not ask for JSON`,
    );
  }
});

Deno.test("index: every action honours the connection's environment host", async () => {
  for (const action of app.actions) {
    const { ctx, calls } = mockCtx([{ body: {} }], { display: { environment: "sandbox" } });
    await action.execute(MINIMAL_INPUT[action.key] as never, ctx);
    const url = new URL(calls[0].url);
    assertEquals(url.host, "connect.squareupsandbox.com", `${action.key} used the wrong host`);
    assert(url.pathname.startsWith("/v2/"), `${action.key} path is not under /v2`);
  }
});

Deno.test("index: production is the default when the connection says nothing", async () => {
  for (const action of app.actions) {
    const { ctx, calls } = mockCtx([{ body: {} }]);
    await action.execute(MINIMAL_INPUT[action.key] as never, ctx);
    assertEquals(new URL(calls[0].url).host, "connect.squareup.com", action.key);
  }
});
