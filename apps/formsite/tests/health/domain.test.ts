import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import domain from "../../health/domain.ts";
import service from "../../health/service.ts";
import { mockCtx, mockFormsiteCtx } from "../_helpers.ts";

const run = (ctx: Parameters<NonNullable<typeof domain.check>>[1]) => domain.check!({}, ctx);

test("domain: 401 passes and the probe is unsigned against the forms list", async () => {
  const { ctx, calls } = mockFormsiteCtx([{ status: 401, body: { error: { status: 401 } } }]);
  const res = await run(ctx);
  assertEquals(res.state, "ok");
  assertEquals(calls[0].url, "https://fs3.formsite.com/api/v2/acme/forms");
  assertEquals(calls[0].headers["authorization"], undefined);
});

test("domain: 200 passes", async () => {
  assertEquals((await run(mockFormsiteCtx([{ body: {} }]).ctx)).state, "ok");
});

test("domain: 404 and 5xx are down, 429 is degraded", async () => {
  assertEquals((await run(mockFormsiteCtx([{ status: 404, body: {} }]).ctx)).state, "down");
  assertEquals((await run(mockFormsiteCtx([{ status: 503, body: {} }]).ctx)).state, "down");
  assertEquals((await run(mockFormsiteCtx([{ status: 429, body: {} }]).ctx)).state, "degraded");
});

test("domain: unknown without a recorded server, and no request is made", async () => {
  const { ctx, calls } = mockCtx();
  assertEquals((await run(ctx)).state, "unknown");
  assertEquals(calls.length, 0);
});

test("service: declared unavailable with a reason", () => {
  assertEquals(service.severity, "informational");
  assertEquals(typeof service.unavailable?.reason, "string");
});
