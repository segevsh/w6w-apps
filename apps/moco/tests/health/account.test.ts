import { assertEquals } from "@std/assert";
import { mockMocoCtx } from "../_helpers.ts";
import account from "../../health/account.ts";

Deno.test("account: unknown when the connection records no account subdomain", async () => {
  const { ctx } = mockMocoCtx([]);
  (ctx as { connection?: { display?: unknown } }).connection!.display = {};
  const out = await account.check!({}, ctx);
  assertEquals(out.state, "unknown");
});

Deno.test("account: ok when the account is real but the key is bad (401 'Invalid API key.')", async () => {
  const { ctx, calls } = mockMocoCtx([{ status: 401, body: { message: "Invalid API key." } }]);
  const out = await account.check!({}, ctx);
  assertEquals(out.state, "ok");
  assertEquals(calls[0].url, "https://acme.mocoapp.com/api/v1/session");
  assertEquals("authorization" in calls[0].headers, false);
});

Deno.test("account: down when the subdomain itself doesn't exist", async () => {
  const { ctx } = mockMocoCtx([{ status: 401, body: { message: "Subdomain does not exist." } }]);
  const out = await account.check!({}, ctx);
  assertEquals(out.state, "down");
});

Deno.test("account: down on a 5xx", async () => {
  const { ctx } = mockMocoCtx([{ status: 503, body: {} }]);
  const out = await account.check!({}, ctx);
  assertEquals(out.state, "down");
});
