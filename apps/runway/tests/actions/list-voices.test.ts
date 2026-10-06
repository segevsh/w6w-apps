import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/list-voices.ts";
import { mockCtx, run } from "../_helpers.ts";

Deno.test("list-voices: sends the documented request and maps the answer", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "data": [{ "id": "a" }], "hasMore": true, "nextCursor": "c2" },
  }]);
  const out = await run(action, { "limit": 5, "cursor": "c1" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.dev.runwayml.com/v1/voices?limit=5&cursor=c1");
  assertEquals(calls[0].headers["x-runway-version"], "2024-11-06");
  assertEquals(calls[0].body, null);
  assertEquals(calls.length, 1);
  assertEquals(JSON.parse(JSON.stringify(out)), {
    "voices": [{ "id": "a" }],
    "hasMore": true,
    "nextCursor": "c2",
  });
});

Deno.test("list-voices: a 401 surfaces Runway's error text", async () => {
  const bad = mockCtx([{
    status: 401,
    body: { error: "No API key was provided." },
  }]);
  await assertRejects(
    () => run(action, { "limit": 5, "cursor": "c1" }, bad.ctx),
    Error,
    "No API key was provided.",
  );
});
