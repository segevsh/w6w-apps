import { assertEquals } from "@std/assert";
import api, { PROBE_URL } from "../../health/api.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("api: is unsigned and informational about nothing it cannot know", () => {
  assertEquals(api.credential, "none");
  assertEquals(api.kind, "dependency");
});

Deno.test("api: the documented 403 error shape proves reachability — a pass, not an outage", async () => {
  const { ctx, calls } = mockCtx([{ status: 403, body: ["API access denied."] }]);
  assertEquals((await api.check!({}, ctx)).state, "ok");
  assertEquals(calls[0].url, PROBE_URL);
  assertEquals(calls[0].headers.cookie, undefined);
  assertEquals(calls[0].headers.authorization, undefined);
});

Deno.test("api: 5xx is down; 429 is degraded", async () => {
  assertEquals((await api.check!({}, mockCtx([{ status: 502, body: "" }]).ctx)).state, "down");
  assertEquals((await api.check!({}, mockCtx([{ status: 429, body: [] }]).ctx)).state, "degraded");
});

Deno.test("api: a 200 shell or an HTML 403 is not KlickTipp answering", async () => {
  assertEquals(
    (await api.check!({}, mockCtx([{ status: 200, body: "<html>app</html>" }]).ctx)).state,
    "down",
  );
  assertEquals(
    (await api.check!({}, mockCtx([{ status: 403, body: "<html>cf</html>" }]).ctx)).state,
    "down",
  );
  assertEquals(
    (await api.check!({}, mockCtx([{ status: 200, body: { a: "b" } }]).ctx)).state,
    "down",
  );
});

Deno.test("api: a transport failure is down", async () => {
  assertEquals((await api.check!({}, mockCtx([]).ctx)).state, "down");
});
