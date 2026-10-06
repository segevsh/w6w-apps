import { assertEquals } from "@std/assert";
import api, { PROBE_URL } from "../../health/api.ts";
import type { HookContext } from "@w6w/types";
import { mockCtx } from "../_helpers.ts";

const run = (ctx: HookContext) => api.check!({} as never, ctx);

Deno.test("api: is an unsigned app-scope probe of /webhooks", () => {
  assertEquals(api.credential, "none");
  assertEquals(PROBE_URL, "https://api.loopreturns.com/api/v1/webhooks");
});

Deno.test("api: a schema-correct JSON 401 proves the API is serving", async () => {
  const { ctx, calls } = mockCtx([{
    status: 401,
    body: { error: { code: "401", http_code: "GEN-UNAUTHORIZED", message: "Unauthorized." } },
  }]);
  assertEquals((await run(ctx)).state, "ok");
  assertEquals(calls[0].headers["x-authorization"], undefined);
});

Deno.test("api: a 5xx is down", async () => {
  const { ctx } = mockCtx([{ status: 502, body: "bad gateway" }]);
  assertEquals((await run(ctx)).state, "down");
});

Deno.test("api: an HTML body is unknown, not ok", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "<html>edge</html>" }]);
  assertEquals((await run(ctx)).state, "unknown");
});

Deno.test("api: a 200 or an unrecognised body is unknown", async () => {
  const a = mockCtx([{ status: 200, body: { webhooks: [] } }]);
  assertEquals((await run(a.ctx)).state, "unknown");
  const b = mockCtx([{ status: 401, body: { nope: 1 } }]);
  assertEquals((await run(b.ctx)).state, "unknown");
});
