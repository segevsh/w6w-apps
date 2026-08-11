import { assertEquals } from "@std/assert";
import action from "../../actions/note-relationship-list.ts";
import { listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("note-relationship-list: GETs the note's relationships", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([{ type: "customer" }]) }]);
  const out = await action.execute({ noteId: "n-1" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v2/notes/n-1/relationships");
  assertEquals(out.items.length, 1);
});

/**
 * This is the ONLY v2 endpoint that accepts a page size. Everywhere else the
 * API chooses it and hands back a cursor, which is why `limit` appears on this
 * action alone.
 */
Deno.test("note-relationship-list: it is the one endpoint carrying a limit", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([]) }]);
  await action.execute({ noteId: "n-1", type: "link", targetType: "feature", limit: 25 }, ctx);
  assertEquals(queryOf(calls[0].url), {
    type: "link",
    "target[type]": "feature",
    limit: "25",
  });
  assertEquals(action.params?.some((p) => p.key === "limit"), true);
});
