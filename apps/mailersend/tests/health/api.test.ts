import { assertEquals } from "@std/assert";
import check from "../../health/api.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("api: is unsigned, informational-free reachability on the app's host", () => {
  assertEquals(check.credential, "none");
  assertEquals(check.network, undefined);
});

Deno.test("api: the documented JSON 401 is ok, and no credential is sent", async () => {
  const { ctx, calls } = mockCtx([{ status: 401, body: { message: "Unauthenticated." } }]);
  const r = await check.check!({}, ctx);
  assertEquals(r.state, "ok");
  assertEquals(new URL(calls[0].url).pathname, "/v1/domains");
  assertEquals("authorization" in calls[0].headers, false);
});

Deno.test("api: a 401 without a message is degraded", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "<html>" }]);
  assertEquals((await check.check!({}, ctx)).state, "degraded");
});

Deno.test("api: 5xx and network failure are down; 200 and other codes degraded", async () => {
  assertEquals((await check.check!({}, mockCtx([{ status: 502, body: "x" }]).ctx)).state, "down");
  assertEquals((await check.check!({}, mockCtx([]).ctx)).state, "down");
  assertEquals(
    (await check.check!({}, mockCtx([{ status: 200, body: { data: [] } }]).ctx)).state,
    "degraded",
  );
  assertEquals(
    (await check.check!({}, mockCtx([{ status: 404, body: { message: "nf" } }]).ctx)).state,
    "degraded",
  );
});
