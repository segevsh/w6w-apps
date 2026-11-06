import assert from "node:assert/strict";
import { test } from "node:test";
import service from "../health/service.ts";
import quota from "../health/quota.ts";
import { mockCtx } from "./_helpers.ts";

test("status service is unsigned and maps the vendor indicators; quota is explicitly unavailable", async () => {
  for (
    const [indicator, expected] of [["none", "ok"], ["minor", "degraded"], ["major", "down"], [
      "critical",
      "down",
    ], ["unexpected", "unknown"]]
  ) {
    const { ctx, calls } = mockCtx(
      [{ body: { status: { indicator, description: "status" } } }],
      "sandbox",
      false,
    );
    assert.equal((await service.check!({}, ctx)).state, expected);
    assert.equal(calls[0].url, "https://status.authorize.net/api/v2/status.json");
    assert.equal(calls[0].body, undefined);
  }
  const missing = mockCtx([{ body: {}, status: 503 }], "sandbox", false);
  assert.equal((await service.check!({}, missing.ctx)).state, "unknown");
  assert.equal(quota.severity, "informational");
  assert.ok(quota.unavailable?.reason);
});
