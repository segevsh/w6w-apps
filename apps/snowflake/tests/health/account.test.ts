import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockSnowflakeCtx } from "../_helpers.ts";
import account from "../../health/account.ts";

test("account: unknown when the connection records no account", async () => {
  const { ctx } = mockSnowflakeCtx();
  (ctx as { connection?: unknown }).connection = { display: {} };
  const out = await account.check!({}, ctx);
  assertEquals(out.state, "unknown");
});

test("account: ok on 401 (host resolved and answered, JWT just wasn't presented)", async () => {
  const { ctx, calls } = mockSnowflakeCtx([{ status: 401, body: { code: "390144" } }]);
  const out = await account.check!({}, ctx);
  assertEquals(out.state, "ok");
  // context posture: no Authorization header — the runtime never runs `sign` for this check.
  assertEquals(calls[0].headers["authorization"], undefined);
});

test("account: down on 404 (account not found)", async () => {
  const { ctx } = mockSnowflakeCtx([{ status: 404 }]);
  const out = await account.check!({}, ctx);
  assertEquals(out.state, "down");
});

test("account: down on a 5xx", async () => {
  const { ctx } = mockSnowflakeCtx([{ status: 503 }]);
  const out = await account.check!({}, ctx);
  assertEquals(out.state, "down");
});
