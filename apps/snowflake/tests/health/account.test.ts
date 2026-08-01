import { assertEquals } from "@std/assert";
import { mockSnowflakeCtx } from "../_helpers.ts";
import account from "../../health/account.ts";

Deno.test("account: unknown when the connection records no account", async () => {
  const { ctx } = mockSnowflakeCtx();
  (ctx as { connection?: unknown }).connection = { display: {} };
  const out = await account.check!({}, ctx);
  assertEquals(out.state, "unknown");
});

Deno.test("account: ok on 401 (host resolved and answered, JWT just wasn't presented)", async () => {
  const { ctx, calls } = mockSnowflakeCtx([{ status: 401, body: { code: "390144" } }]);
  const out = await account.check!({}, ctx);
  assertEquals(out.state, "ok");
  // context posture: no Authorization header — the runtime never runs `sign` for this check.
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("account: down on 404 (account not found)", async () => {
  const { ctx } = mockSnowflakeCtx([{ status: 404 }]);
  const out = await account.check!({}, ctx);
  assertEquals(out.state, "down");
});

Deno.test("account: down on a 5xx", async () => {
  const { ctx } = mockSnowflakeCtx([{ status: 503 }]);
  const out = await account.check!({}, ctx);
  assertEquals(out.state, "down");
});
