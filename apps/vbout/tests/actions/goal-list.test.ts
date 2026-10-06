import { assert, assertEquals, assertRejects } from "@std/assert";
import goalList from "../../actions/goal-list.ts";
import { errorEnvelope, mockCtx, okEnvelope, pathOf, queryOf } from "../_helpers.ts";

Deno.test("goal-list: GETs goal/lists.json with the documented parameters", async () => {
  const { ctx, calls } = mockCtx([{ body: okEnvelope({ "goals": { "count": 0, "items": [] } }) }]);
  const out = await goalList.execute({} as never, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/1/goal/lists.json");
  assertEquals(queryOf(calls[0].url), {});
  // The credential is the Auth `sign` hook's job; the action never sets it.
  assertEquals(queryOf(calls[0].url)["key"], undefined);
  assertEquals(out, { "goals": { "count": 0, "items": [] } });
});

Deno.test("goal-list: is a read with no request body", async () => {
  const { ctx, calls } = mockCtx([{ body: okEnvelope({ "goals": { "count": 0, "items": [] } }) }]);
  await goalList.execute({} as never, ctx);
  assertEquals(calls[0].body, null);
  assertEquals(goalList.type, "read");
});

Deno.test("goal-list: an error envelope rejects with the vendor's message, whatever the status", async () => {
  for (const status of [200, 401]) {
    const { ctx } = mockCtx([{ status, body: errorEnvelope(1002, "bad thing") }]);
    const err = await assertRejects(async () => await goalList.execute({} as never, ctx));
    assert((err as Error).message.includes("bad thing"));
  }
});
