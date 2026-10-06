import { assertEquals } from "@std/assert";
import api from "../../health/api.ts";
import { errorBody, mockCtx } from "../_helpers.ts";

Deno.test("api: declared unsigned with no extra egress", () => {
  assertEquals(api.credential, "none");
  assertEquals(api.network, undefined);
});

Deno.test("api: the documented 401 envelope is a pass, sent without credentials", async () => {
  const { ctx, calls } = mockCtx([{ status: 401, body: errorBody(401, "no gladia key provided") }]);
  assertEquals((await api.check!({}, ctx)).state, "ok");
  assertEquals(calls[0].url, "https://api.gladia.io/v2/pre-recorded?limit=1");
  assertEquals("x-gladia-key" in calls[0].headers, false);
});

Deno.test("api: a 401 without Gladia's envelope is only degraded", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: "<html>",
    headers: { "content-type": "text/html" },
  }]);
  assertEquals((await api.check!({}, ctx)).state, "degraded");
});

Deno.test("api: 200 is unexpected, 5xx is down, 404 is degraded, network failure is down", async () => {
  assertEquals((await api.check!({}, mockCtx([{ body: { items: [] } }]).ctx)).state, "degraded");
  assertEquals((await api.check!({}, mockCtx([{ status: 502 }]).ctx)).state, "down");
  assertEquals((await api.check!({}, mockCtx([{ status: 404 }]).ctx)).state, "degraded");
  assertEquals((await api.check!({}, mockCtx([]).ctx)).state, "down");
});
