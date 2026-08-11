import { assert, assertEquals } from "@std/assert";
import store from "../../health/store.ts";
import { mockCtx, pathOf, v3Error } from "../_helpers.ts";

Deno.test("health/store: is signed and connection-scoped", () => {
  assertEquals(store.credential, "signed");
  assertEquals(store.scope, "connection");
  assertEquals(store.kind, "dependency");
  assertEquals(store.network, undefined);
});

Deno.test("health/store: a live store on a paid plan is ok", async () => {
  const { ctx, calls } = mockCtx([{
    body: { status: "live", name: "Acme", plan_name: "Pro", plan_is_trial: false },
  }]);
  const report = await store.check!({}, ctx);

  assertEquals(pathOf(calls[0].url), "/stores/abc123/v2/store");
  assertEquals(report.state, "ok");
  assertEquals(report.components?.status.message, "live");
  assertEquals(report.components?.plan.message, "Pro");
});

Deno.test("health/store: a trial is flagged, because a lapsed trial suspends the store", async () => {
  const { ctx } = mockCtx([{ body: { status: "live", plan_name: "Trial", plan_is_trial: true } }]);
  const report = await store.check!({}, ctx);
  assertEquals(report.state, "degraded");
  assert(report.message?.includes("trial"), report.message);
});

Deno.test("health/store: an unrecognised status is reported VERBATIM, not mapped", async () => {
  // BigCommerce publishes no vocabulary for this field, so inventing a mapping
  // would be confident nonsense.
  const { ctx } = mockCtx([{ body: { status: "maintenance" } }]);
  const report = await store.check!({}, ctx);
  assertEquals(report.state, "degraded");
  assert(report.message?.includes('store status is "maintenance"'), report.message);
});

Deno.test("health/store: a 403 is `unknown` — a narrow token is a good token", async () => {
  const { ctx } = mockCtx([{ status: 403, body: v3Error(403, "Forbidden") }]);
  const report = await store.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assert(report.message?.includes("Information & Settings"), report.message);
  assert(report.message?.includes("not a problem with the store"), report.message);
});

Deno.test("health/store: 503 is down, 401 defers to the auth check", async () => {
  const down = mockCtx([{ status: 503, body: "" }]);
  assertEquals((await store.check!({}, down.ctx)).state, "down");

  const unauthorized = mockCtx([{ status: 401, body: "X-Auth-Token header is required" }]);
  const report = await store.check!({}, unauthorized.ctx);
  assertEquals(report.state, "unknown");
  assert(report.message?.includes("see the auth check"), report.message);
});

Deno.test("health/store: a missing status field is `unknown`, not assumed healthy", async () => {
  const { ctx } = mockCtx([{ body: { name: "Acme" } }]);
  const report = await store.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assertEquals(report.components?.status.state, "unknown");
});

Deno.test("health/store: without a store hash it reports unknown and makes no request", async () => {
  const { ctx } = mockCtx([], { storeHash: null });
  assertEquals((await store.check!({}, ctx)).state, "unknown");
});
