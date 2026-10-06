import { assertEquals, assertRejects } from "@std/assert";
import noteSearch from "../../actions/note-search.ts";
import { jsonBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = {
  "query": "trip",
  "limit": 5,
  "offset": 10,
  "filter_by_collection_ids": "22222222-2222-4222-8222-222222222222",
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
  "offset": 10,
  "limit": 5,
  "has_next_page": false,
  "snapshot_id": "22222222-2222-4222-8222-222222222222",
};

Deno.test("note-search: POST /v2/notes/search", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: RESPONSE }]);
  const out = await noteSearch.execute(INPUT, ctx) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/notes/search");
  assertEquals(queryOf(calls[0].url), { "limit": "5", "offset": "10" });
  assertEquals(jsonBody(calls[0]), {
    "query": "trip",
    "filter_by_collection_ids": ["22222222-2222-4222-8222-222222222222"],
    "config": { "include_note_content": true },
  });
  assertEquals(calls[0].url.startsWith("https://api.mem.ai/"), true);
  assertEquals((out.items as unknown[]).length, 1);
  assertEquals(out.hasMore, false);
  assertEquals(out.snapshotId, "22222222-2222-4222-8222-222222222222");
  assertEquals(out.offset, 10);
});

Deno.test("note-search: puts no credential on the request (sign owns that)", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: RESPONSE }]);
  await noteSearch.execute(INPUT, ctx);
  assertEquals(calls[0].headers.authorization, undefined);
});

Deno.test("note-search: a vendor error surfaces its own message", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: {
      error_category: "CLIENT_ERROR",
      error_metadata: { error_kind: "NOT_FOUND", message: "no such thing" },
    },
  }]);
  const err = await assertRejects(() => Promise.resolve(noteSearch.execute(INPUT, ctx))) as Error;
  assertEquals(err.message.includes("(404)"), true);
  assertEquals(err.message.includes("no such thing"), true);
});
