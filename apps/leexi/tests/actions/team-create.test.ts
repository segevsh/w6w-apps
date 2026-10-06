import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/team-create.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("team-create: full input maps to POST /teams", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "success": true, "data": { "uuid": "x1" }, "message": "ok" },
  }]);
  const out = await action.execute!({ "name": "sample-name", "active": true }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, "https://public-api.leexi.ai/v1/teams");
  assertEquals(calls[0].method, "POST");
  assertEquals(decodeURIComponent(url.search), "");
  assertEquals(JSON.parse(calls[0].body!), { "name": "sample-name", "active": true });
  assertEquals(out, { "data": { "uuid": "x1" }, "message": "ok" });
});

Deno.test("team-create: required input only maps to POST /teams", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "success": true, "data": { "uuid": "x1" }, "message": "ok" },
  }]);
  const out = await action.execute!({ "name": "sample-name" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, "https://public-api.leexi.ai/v1/teams");
  assertEquals(calls[0].method, "POST");
  assertEquals(decodeURIComponent(url.search), "");
  assertEquals(JSON.parse(calls[0].body!), { "name": "sample-name" });
  assertEquals(out, { "data": { "uuid": "x1" }, "message": "ok" });
});

Deno.test("team-create: sends no authorization header of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true, data: {}, message: "ok" } }]);
  await action.execute!({ "name": "sample-name", "active": true }, ctx);
  assert(!("authorization" in calls[0].headers), "the sign hook injects credentials, not actions");
});

Deno.test("team-create: surfaces a JSON error body as a thrown error", async () => {
  const { ctx } = mockCtx([{ status: 422, body: { message: "Name already taken" } }]);
  await assertRejects(
    async () => await action.execute!({ "name": "sample-name", "active": true }, ctx),
    Error,
    "HTTP 422 — Name already taken",
  );
});

Deno.test("team-create: an empty 401 body still reads as an auth failure", async () => {
  const { ctx } = mockCtx([{ status: 401, headers: { "content-type": "text/html" } }]);
  await assertRejects(
    async () => await action.execute!({ "name": "sample-name", "active": true }, ctx),
    Error,
    "HTTP 401 (API key ID/secret missing or invalid)",
  );
});

Deno.test("team-create: declares type, params and output", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.key, "team-create");
  assert(Array.isArray(action.output) && action.output.length > 0);
  assertEquals(action.params!.length, 2);
  assertEquals(action.idempotent, false);
});
