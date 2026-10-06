import { assertEquals, assertRejects } from "@std/assert";
import noteUpdate from "../../actions/note-update.ts";
import { jsonBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = {
  "note_id": "11111111-1111-4111-8111-111111111111",
  "content": "# New",
  "version": 2,
};
const RESPONSE = {
  "request_id": "r1",
  "id": "11111111-1111-4111-8111-111111111111",
  "title": "Trip plan",
  "content": "# Trip plan\nFlights",
  "version": 3,
  "collection_ids": ["22222222-2222-4222-8222-222222222222"],
  "created_at": "2026-01-31T09:00:00Z",
  "updated_at": "2026-01-31T09:00:00Z",
  "trashed_at": null,
};

Deno.test("note-update: PATCH /v2/notes/{note_id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: RESPONSE }]);
  const out = await noteUpdate.execute(INPUT, ctx) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/v2/notes/11111111-1111-4111-8111-111111111111");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(jsonBody(calls[0]), { "content": "# New", "version": 2 });
  assertEquals(calls[0].url.startsWith("https://api.mem.ai/"), true);
  assertEquals(out.version, 3);
});

Deno.test("note-update: puts no credential on the request (sign owns that)", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: RESPONSE }]);
  await noteUpdate.execute(INPUT, ctx);
  assertEquals(calls[0].headers.authorization, undefined);
});

Deno.test("note-update: a vendor error surfaces its own message", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: {
      error_category: "CLIENT_ERROR",
      error_metadata: { error_kind: "NOT_FOUND", message: "no such thing" },
    },
  }]);
  const err = await assertRejects(() => Promise.resolve(noteUpdate.execute(INPUT, ctx))) as Error;
  assertEquals(err.message.includes("(404)"), true);
  assertEquals(err.message.includes("no such thing"), true);
});
