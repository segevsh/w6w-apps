import { assertEquals } from "@std/assert";
import account from "../../health/account.ts";
import { BASE, mockCtx, nsError } from "../_helpers.ts";

Deno.test("account: an unsigned NetSuite error envelope is a pass", async () => {
  const { ctx, calls } = mockCtx([nsError(401, "INVALID_LOGIN", "Invalid login attempt.")]);
  const r = await account.check!({} as never, ctx);
  assertEquals(r.state, "ok");
  assertEquals(calls[0].url, `${BASE}/services/rest/system/v1/serverTime`);
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("account: a fetch failure (DNS) is down and names the account host", async () => {
  const { ctx } = mockCtx([]);
  const r = await account.check!({} as never, ctx);
  assertEquals(r.state, "down");
  assertEquals(r.message?.includes("1234567.suitetalk.api.netsuite.com"), true);
});

Deno.test("account: 5xx is down, markup is down, plain junk is unknown", async () => {
  let m = mockCtx([{ status: 502, body: "bad" }]);
  assertEquals((await account.check!({} as never, m.ctx)).state, "down");
  m = mockCtx([{ status: 200, body: "<html>spa</html>" }]);
  assertEquals((await account.check!({} as never, m.ctx)).state, "down");
  m = mockCtx([{ status: 404, body: "nope" }]);
  assertEquals((await account.check!({} as never, m.ctx)).state, "unknown");
});

Deno.test("account: no recorded account id is unknown without a request", async () => {
  const { ctx, calls } = mockCtx([], null);
  assertEquals((await account.check!({} as never, ctx)).state, "unknown");
  assertEquals(calls.length, 0);
});
