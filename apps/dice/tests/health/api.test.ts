import { test } from "node:test";
import assert from "node:assert/strict";
import api from "../../health/api.ts";
import service from "../../health/service.ts";
import quota from "../../health/quota.ts";
import { mockCtx } from "../_helpers.ts";
import { unauthorized } from "../fixtures.ts";

test("unsigned observed auth rejection proves API reachability", async () => {
  const { ctx, calls } = mockCtx([{ status: 401, body: unauthorized }]);
  assert.equal((await api.check!({}, ctx)).state, "ok");
  assert.equal(calls[0].headers.authorization, undefined);
  assert.equal(api.credential, "none");
});
test("HTML or arbitrary JSON 200 does not prove API health", async () => {
  for (const body of ["<html>catchall</html>", {}, { data: {} }, { error: "unauthorized" }]) {
    const { ctx } = mockCtx([{ body }]);
    assert.equal((await api.check!({}, ctx)).state, "unknown");
  }
});
test("gateway failure is down", async () => {
  const { ctx } = mockCtx([{ status: 502, body: "bad gateway" }]);
  assert.equal((await api.check!({}, ctx)).state, "down");
});
test("unavailable vendor status and quota remain informational", () => {
  for (const check of [service, quota]) {
    assert.equal(check.severity, "informational");
    assert.ok(check.unavailable.reason);
  }
});
