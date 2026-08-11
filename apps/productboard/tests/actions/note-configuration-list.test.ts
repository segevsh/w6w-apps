import { assertEquals } from "@std/assert";
import action from "../../actions/note-configuration-list.ts";
import { listEnvelope, mockCtx, pathOf, queryAll } from "../_helpers.ts";

Deno.test("note-configuration-list: GETs the note configurations path", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([{ type: "textNote" }]) }]);
  const out = await action.execute({}, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v2/notes/configurations");
  assertEquals(out.items.length, 1);
});

/**
 * The endpoint declares both `type[]` and a singular `type`. This app uses the
 * repeated form, which can express everything the singular one can.
 */
Deno.test("note-configuration-list: uses the repeated type[] form, not the singular alias", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([]) }]);
  await action.execute({ types: ["textNote", "conversationNote"] }, ctx);
  assertEquals(queryAll(calls[0].url, "type[]"), ["textNote", "conversationNote"]);
  assertEquals(queryAll(calls[0].url, "type"), []);
});
