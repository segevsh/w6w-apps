import { assert, assertEquals } from "@std/assert";
import site from "../../health/site.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("site: dependency / connection / context posture, no extra allowlist", () => {
  assertEquals(site.kind, "dependency");
  assertEquals(site.scope, "connection");
  assertEquals(site.credential, "context");
  assertEquals(site.network, undefined);
});

Deno.test("site: unknown, with no request, when the connection records no subdomain", async () => {
  const { ctx, calls } = mockCtx([], null);
  assertEquals((await site.check!({} as never, ctx)).state, "unknown");
  assertEquals(calls.length, 0);
});

Deno.test("site: ok on the documented server_settings success body", async () => {
  const { ctx, calls } = mockCtx([{ body: { result: "success", msg: "", zulip_version: "12.0" } }]);
  const r = await site.check!({} as never, ctx);
  assertEquals(r.state, "ok");
  assertEquals(calls[0].url, "https://acme.zulipchat.com/api/v1/server_settings");
  assertEquals("authorization" in calls[0].headers, false);
});

Deno.test("site: an unknown subdomain (400 Invalid subdomain) and a 5xx are down", async () => {
  const gone = await site.check!(
    {} as never,
    mockCtx([{ status: 400, body: { result: "error", msg: "Invalid subdomain" } }]).ctx,
  );
  assertEquals(gone.state, "down");
  assert(gone.message!.includes("Invalid subdomain"));
  assertEquals(
    (await site.check!({} as never, mockCtx([{ status: 502, body: "" }]).ctx)).state,
    "down",
  );
});

Deno.test("site: a 200 that is not the Zulip shape is degraded; a transport failure is down", async () => {
  const odd = await site.check!(
    {} as never,
    mockCtx([{ body: "<html>", headers: { "content-type": "text/html" } }]).ctx,
  );
  assertEquals(odd.state, "degraded");
  assertEquals((await site.check!({} as never, mockCtx([]).ctx)).state, "down");
});
