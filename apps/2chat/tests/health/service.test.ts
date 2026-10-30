import assert from "node:assert/strict";
import { test } from "node:test";
import { mockCtx } from "../_helpers.ts";
import service from "../../health/service.ts";

test("service: a 403 'Not authenticated' from the unsigned probe is a PASS", async () => {
  const { ctx, calls } = mockCtx([{ status: 403, body: { detail: "Not authenticated" } }]);
  const report = await service.check!({}, ctx);
  assert.deepStrictEqual(report.state, "ok");
  assert.deepStrictEqual(calls[0].url, "https://api.p.2chat.io/open/info");
  assert.deepStrictEqual(calls[0].headers["x-user-api-key"], undefined, "the probe must be unsigned");
});

test("service: a 401 'Invalid API Key' is also a pass", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { detail: "Invalid API Key" } }]);
  assert.deepStrictEqual((await service.check!({}, ctx)).state, "ok");
});

test("service: the documented {error_message} envelope also proves reachability", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { error: true, error_message: "Unauthorized" } }]);
  assert.deepStrictEqual((await service.check!({}, ctx)).state, "ok");
});

test("service: down on a 5xx", async () => {
  const { ctx } = mockCtx([{ status: 503, body: { detail: "unavailable" } }]);
  assert.deepStrictEqual((await service.check!({}, ctx)).state, "down");
});

test("service: down when the host cannot be reached at all", async () => {
  const { ctx } = mockCtx([]); // the mock throws on an unexpected fetch
  assert.deepStrictEqual((await service.check!({}, ctx)).state, "down");
});

test("service: a 403 with no recognisable body is unknown, not a pass", async () => {
  const { ctx } = mockCtx([{ status: 403, body: "<html>cdn</html>", headers: {} }]);
  assert.deepStrictEqual((await service.check!({}, ctx)).state, "unknown");
});

test("service: an unsigned 200 is a shell, not the API", async () => {
  const { ctx } = mockCtx([{ status: 200, body: "<html>app</html>", headers: {} }]);
  assert.deepStrictEqual((await service.check!({}, ctx)).state, "unknown");
});

test("service: unsigned, app-scoped, adds no host of its own", () => {
  assert.deepStrictEqual(service.kind, "service");
  assert.deepStrictEqual(service.credential, undefined); // defaults to "none" for kind:"service"
  assert.deepStrictEqual(service.network, undefined);
});
