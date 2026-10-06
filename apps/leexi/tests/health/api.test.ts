import { assertEquals } from "@std/assert";
import api from "../../health/api.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("api: declared unsigned with a degraded-or-better severity and no extra egress", () => {
  assertEquals(api.credential, "none");
  assertEquals(api.kind, "dependency");
  assertEquals(api.network, undefined);
});

Deno.test("api: an unauthenticated 401 is a pass, requested without credentials", async () => {
  const { ctx, calls } = mockCtx([{ status: 401, headers: { "content-type": "text/html" } }]);
  const res = await api.check!({}, ctx);
  assertEquals(res.state, "ok");
  assertEquals(calls[0].url, "https://public-api.leexi.ai/v1/users");
  assertEquals("authorization" in calls[0].headers, false);
});

Deno.test("api: a 200 without credentials is unexpected, not ok", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { data: [] } }]);
  assertEquals((await api.check!({}, ctx)).state, "degraded");
});

Deno.test("api: 5xx is down, 404 is degraded", async () => {
  assertEquals((await api.check!({}, mockCtx([{ status: 522 }]).ctx)).state, "down");
  assertEquals((await api.check!({}, mockCtx([{ status: 404 }]).ctx)).state, "degraded");
});

Deno.test("api: a network failure is down", async () => {
  const res = await api.check!({}, mockCtx([]).ctx);
  assertEquals(res.state, "down");
});
