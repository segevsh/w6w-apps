import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/team-list.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("team-list: full input maps to GET /teams", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      "data": [{ "uuid": "x1" }],
      "pagination": { "page": 1, "items": 10, "count": 1, "pages": 1 },
    },
  }]);
  const out = await action.execute!({ "page": 2, "items": 2 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, "https://public-api.leexi.ai/v1/teams");
  assertEquals(calls[0].method, "GET");
  assertEquals(decodeURIComponent(url.search), "?page=2&items=2");
  assertEquals(calls[0].body, null);
  assertEquals(out, {
    "data": [{ "uuid": "x1" }],
    "pagination": { "page": 1, "items": 10, "count": 1, "pages": 1 },
  });
});

Deno.test("team-list: sends no authorization header of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true, data: {}, message: "ok" } }]);
  await action.execute!({ "page": 2, "items": 2 }, ctx);
  assert(!("authorization" in calls[0].headers), "the sign hook injects credentials, not actions");
});

Deno.test("team-list: surfaces a JSON error body as a thrown error", async () => {
  const { ctx } = mockCtx([{ status: 422, body: { message: "Name already taken" } }]);
  await assertRejects(
    async () => await action.execute!({ "page": 2, "items": 2 }, ctx),
    Error,
    "HTTP 422 — Name already taken",
  );
});

Deno.test("team-list: an empty 401 body still reads as an auth failure", async () => {
  const { ctx } = mockCtx([{ status: 401, headers: { "content-type": "text/html" } }]);
  await assertRejects(
    async () => await action.execute!({ "page": 2, "items": 2 }, ctx),
    Error,
    "HTTP 401 (API key ID/secret missing or invalid)",
  );
});

Deno.test("team-list: declares type, params and output", () => {
  assertEquals(action.type, "search");
  assertEquals(action.key, "team-list");
  assert(Array.isArray(action.output) && action.output.length > 0);
  assertEquals(action.params!.length, 2);
});
