import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/team-update.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("team-update: full input maps to PATCH /teams/{uuid}", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "success": true, "data": { "uuid": "x1" }, "message": "ok" },
  }]);
  const out = await action.execute!({
    "uuid": "11111111-aaaa",
    "name": "sample-name",
    "active": true,
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, "https://public-api.leexi.ai/v1/teams/11111111-aaaa");
  assertEquals(calls[0].method, "PATCH");
  assertEquals(decodeURIComponent(url.search), "");
  assertEquals(JSON.parse(calls[0].body!), { "name": "sample-name", "active": true });
  assertEquals(out, { "data": { "uuid": "x1" }, "message": "ok" });
});

Deno.test("team-update: required input only maps to PATCH /teams/{uuid}", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "success": true, "data": { "uuid": "x1" }, "message": "ok" },
  }]);
  const out = await action.execute!({ "uuid": "11111111-aaaa" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, "https://public-api.leexi.ai/v1/teams/11111111-aaaa");
  assertEquals(calls[0].method, "PATCH");
  assertEquals(decodeURIComponent(url.search), "");
  assertEquals(JSON.parse(calls[0].body!), {});
  assertEquals(out, { "data": { "uuid": "x1" }, "message": "ok" });
});

Deno.test("team-update: sends no authorization header of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true, data: {}, message: "ok" } }]);
  await action.execute!({ "uuid": "11111111-aaaa", "name": "sample-name", "active": true }, ctx);
  assert(!("authorization" in calls[0].headers), "the sign hook injects credentials, not actions");
});

Deno.test("team-update: surfaces a JSON error body as a thrown error", async () => {
  const { ctx } = mockCtx([{ status: 422, body: { message: "Name already taken" } }]);
  await assertRejects(
    async () =>
      await action.execute!(
        { "uuid": "11111111-aaaa", "name": "sample-name", "active": true },
        ctx,
      ),
    Error,
    "HTTP 422 — Name already taken",
  );
});

Deno.test("team-update: an empty 401 body still reads as an auth failure", async () => {
  const { ctx } = mockCtx([{ status: 401, headers: { "content-type": "text/html" } }]);
  await assertRejects(
    async () =>
      await action.execute!(
        { "uuid": "11111111-aaaa", "name": "sample-name", "active": true },
        ctx,
      ),
    Error,
    "HTTP 401 (API key ID/secret missing or invalid)",
  );
});

Deno.test("team-update: declares type, params and output", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.key, "team-update");
  assert(Array.isArray(action.output) && action.output.length > 0);
  assertEquals(action.params!.length, 3);
  assertEquals(action.idempotent, true);
});
