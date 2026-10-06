import { assertEquals, assertRejects } from "@std/assert";
import noteList from "../../actions/note-list.ts";
import { jsonBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = {
  "limit": 10,
  "collection_id": "22222222-2222-4222-8222-222222222222",
  "include_note_content": true,
};
const RESPONSE = {
  "request_id": "r",
  "results": [{
    "id": "11111111-1111-4111-8111-111111111111",
    "title": "Trip plan",
    "snippet": "Flights",
    "collection_ids": ["22222222-2222-4222-8222-222222222222"],
    "audio_recording_ids": [],
    "created_at": "2026-01-31T09:00:00Z",
    "updated_at": "2026-01-31T09:00:00Z",
  }],
  "total": 1,
  "next_page": "cursor2",
};

Deno.test("note-list: GET /v2/notes", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: RESPONSE }]);
  const out = await noteList.execute(INPUT, ctx) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v2/notes");
  assertEquals(queryOf(calls[0].url), {
    "limit": "10",
    "collection_id": "22222222-2222-4222-8222-222222222222",
    "include_note_content": "true",
  });
  assertEquals(jsonBody(calls[0]), null);
  assertEquals(calls[0].url.startsWith("https://api.mem.ai/"), true);
  assertEquals((out.items as unknown[]).length, 1);
  assertEquals(out.total, 1);
  assertEquals(out.nextPage, "cursor2");
  assertEquals(out.hasMore, true);
});

Deno.test("note-list: puts no credential on the request (sign owns that)", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: RESPONSE }]);
  await noteList.execute(INPUT, ctx);
  assertEquals(calls[0].headers.authorization, undefined);
});

Deno.test("note-list: a vendor error surfaces its own message", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: {
      error_category: "CLIENT_ERROR",
      error_metadata: { error_kind: "NOT_FOUND", message: "no such thing" },
    },
  }]);
  const err = await assertRejects(() => Promise.resolve(noteList.execute(INPUT, ctx))) as Error;
  assertEquals(err.message.includes("(404)"), true);
  assertEquals(err.message.includes("no such thing"), true);
});
