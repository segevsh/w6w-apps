import assert from "node:assert/strict";
import { test } from "node:test";
import auth from "../../auth/sendgrid-api.ts";
import { mockCtx } from "../_helpers.ts";

test("credential check authenticates its read-only scopes request", async () => {
  const { ctx, calls } = mockCtx([{ body: { scopes: ["mail.send"] } }]);
  const result = await auth.test({ credential: { apiKey: "SG.test-key" } }, ctx);

  assert.deepEqual(result, { ok: true });
  assert.deepEqual(calls, [{
    url: "https://api.sendgrid.com/v3/scopes",
    method: "GET",
    headers: { authorization: "Bearer SG.test-key" },
    body: null,
  }]);
});

for (const status of [401, 403, 429, 500]) {
  test(`credential check reports HTTP ${status} without exposing the key`, async () => {
    const { ctx } = mockCtx([{ status }]);
    assert.deepEqual(await auth.test({ credential: { apiKey: "SG.test-key" } }, ctx), {
      ok: false,
      message: `Auth check returned ${status}`,
    });
  });
}

test("missing credentials fail without a network request", async () => {
  for (const credential of [undefined, null, {}, { apiKey: "" }]) {
    const { ctx, calls } = mockCtx();
    assert.deepEqual(await auth.test({ credential }, ctx), {
      ok: false,
      message: "credential missing apiKey",
    });
    assert.equal(calls.length, 0);
  }
});
