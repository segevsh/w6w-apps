import { assert, assertEquals, assertRejects } from "@std/assert";
import socialStatsList from "../../actions/social-stats-list.ts";
import { errorEnvelope, mockCtx, okEnvelope, pathOf, queryOf } from "../_helpers.ts";

Deno.test("social-stats-list: GETs socialmedia/stats.json with the documented parameters", async () => {
  const { ctx, calls } = mockCtx([{ body: okEnvelope({ "stats": { "items": [] } }) }]);
  const out = await socialStatsList.execute({ "channels": "all", "sort": "asc" } as never, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/1/socialmedia/stats.json");
  assertEquals(queryOf(calls[0].url), { "channels": "all", "sort": "asc" });
  // The credential is the Auth `sign` hook's job; the action never sets it.
  assertEquals(queryOf(calls[0].url)["key"], undefined);
  assertEquals(out, { "stats": { "items": [] } });
});

Deno.test("social-stats-list: is a read with no request body", async () => {
  const { ctx, calls } = mockCtx([{ body: okEnvelope({ "stats": { "items": [] } }) }]);
  await socialStatsList.execute({ "channels": "all", "sort": "asc" } as never, ctx);
  assertEquals(calls[0].body, null);
  assertEquals(socialStatsList.type, "read");
});

Deno.test("social-stats-list: an error envelope rejects with the vendor's message, whatever the status", async () => {
  for (const status of [200, 401]) {
    const { ctx } = mockCtx([{ status, body: errorEnvelope(1002, "bad thing") }]);
    const err = await assertRejects(async () =>
      await socialStatsList.execute({ "channels": "all", "sort": "asc" } as never, ctx)
    );
    assert((err as Error).message.includes("bad thing"));
  }
});
