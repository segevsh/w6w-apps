import { test } from "node:test";
import assert from "node:assert/strict";
import auth from "../../auth/api-token.ts";
import { mockCtx } from "../_helpers.ts";
import { unauthorized, viewer } from "../fixtures.ts";

test("sign stamps bearer only onto the documented endpoint", async () => {
  const { ctx } = mockCtx();
  const req = {
    url: "https://partners-endpoint.dice.fm/graphql",
    method: "POST",
    headers: { accept: "application/json" },
  };
  const signed = await auth.sign!({ request: req, credential: { token: "secret" } }, ctx);
  assert.equal(signed.headers.authorization, "Bearer secret");
  assert.equal(signed.headers.accept, "application/json");
  assert.throws(
    () =>
      auth.sign!({
        request: { ...req, url: "https://example.com" },
        credential: { token: "secret" },
      }, ctx),
    /only sign/,
  );
});
test("connect tests a real partner without logging or returning the token", async () => {
  const { ctx, calls, logs } = mockCtx([{ body: { data: { viewer } } }]);
  assert.deepEqual(await auth.test({ credential: { token: "secret" } }, ctx), { ok: true });
  assert.equal(calls[0].headers.authorization, "Bearer secret");
  assert.equal(JSON.parse(calls[0].body!).query, "query W6WViewer { viewer { id name } }");
  assert.deepEqual(logs, []);
});
test("missing token fails without a request", async () => {
  const { ctx, calls } = mockCtx();
  assert.equal((await auth.test({ credential: {} }, ctx)).ok, false);
  assert.equal(calls.length, 0);
});
for (
  const body of [unauthorized, { data: { viewer: null } }, {
    data: { viewer },
    errors: [{ message: "denied" }],
  }, { data: {} }]
) {
  test(`connect rejects unsuccessful body ${JSON.stringify(body)}`, async () => {
    const { ctx } = mockCtx([{ body }]);
    assert.equal((await auth.test({ credential: { token: "secret" } }, ctx)).ok, false);
  });
}
