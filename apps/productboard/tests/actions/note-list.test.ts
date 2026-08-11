import { assertEquals } from "@std/assert";
import action from "../../actions/note-list.ts";
import { listEnvelope, mockCtx, pathOf, queryAll, queryOf } from "../_helpers.ts";

Deno.test("note-list: GETs /v2/notes", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([{ id: "n-1" }], "cur-1") }]);
  const out = await action.execute({}, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v2/notes");
  assertEquals(out.nextPageCursor, "cur-1");
});

/**
 * The triage-inbox query. `processed=false` must reach the wire — if the
 * builder dropped a false the action would silently return every note.
 */
Deno.test("note-list: processed=false and archived=false both survive", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([]) }]);
  await action.execute({ processed: false, archived: false }, ctx);
  assertEquals(queryOf(calls[0].url), { processed: "false", archived: "false" });
});

/**
 * The vendor spells the field selector `fields` here and `fields[]` on
 * /notes/search and on every entities endpoint. Sending the wrong one is
 * silently ignored, so the spelling is pinned.
 */
Deno.test("note-list: the field selector is `fields`, WITHOUT brackets, on this endpoint", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([]) }]);
  await action.execute({ fields: "name,content" }, ctx);
  assertEquals(queryAll(calls[0].url, "fields"), ["name", "content"]);
  assertEquals(queryAll(calls[0].url, "fields[]"), []);
});

Deno.test("note-list: owner, creator and source filters use bracketed keys", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([]) }]);
  await action.execute({
    ownerEmail: "jane@example.com",
    creatorId: "c-1",
    sourceSystem: "support",
    sourceRecordId: "ticket-1",
    createdFrom: "2026-01-01T00:00:00Z",
    updatedTo: "2026-02-01T00:00:00Z",
  }, ctx);
  assertEquals(queryOf(calls[0].url), {
    "owner[email]": "jane@example.com",
    "creator[id]": "c-1",
    "metadata[source][system]": "support",
    "metadata[source][recordId]": "ticket-1",
    createdFrom: "2026-01-01T00:00:00Z",
    updatedTo: "2026-02-01T00:00:00Z",
  });
});

Deno.test("note-list: note types are repeated type[] keys", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([]) }]);
  await action.execute({ types: "textNote,conversationNote" }, ctx);
  assertEquals(queryAll(calls[0].url, "type[]"), ["textNote", "conversationNote"]);
});
