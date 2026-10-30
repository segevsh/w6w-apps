import { test } from "node:test";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/token-grant.ts";

const display = { projectId: "proj_1" };

test("token-grant: posts the lifetime and returns the token", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 200, body: { access_token: "jwt.abc", expires_in: 30 } }],
    { display },
  );
  const result = await action.execute!({}, ctx) as { access_token: string };
  assertEquals(calls[0].url, "https://api.deepgram.com/v1/auth/grant");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { ttl_seconds: 30 });
  assertEquals(result.access_token, "jwt.abc");
});

test("token-grant: a longer lifetime reaches the wire", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { expires_in: 300 } }], { display });
  await action.execute!({ ttlSeconds: 300 }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { ttl_seconds: 300 });
});

/** For its lifetime the token is exactly as powerful as the key that minted it. */
test("token-grant: logs the lifetime, never the token", async () => {
  const { ctx, logs } = mockCtx(
    [{ status: 200, body: { access_token: "jwt.verysecret", expires_in: 30 } }],
    { display },
  );
  await action.execute!({}, ctx);
  assert(!JSON.stringify(logs).includes("verysecret"), JSON.stringify(logs));
  assertEquals(logs[0].data, { expiresIn: 30 });
});

test("token-grant: a non-positive lifetime is refused before the request", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ ttlSeconds: 0 }, ctx),
    Error,
    "positive",
  );
  assertEquals(calls.length, 0);
});

/** The whole point: the key never reaches the client. */
test("token-grant: says what it is for", () => {
  assert(/without ever holding the API key/.test(action.description!), action.description);
});
