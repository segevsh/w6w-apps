import { assertEquals, assertRejects } from "@std/assert";
import noteExtendedSearch from "../../actions/note-extended-search.ts";
import { jsonBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = {
  "query": "invoice",
  "limit": 20,
  "sort_by": "DATE",
  "exclude_note_ids": "11111111-1111-4111-8111-111111111111,22222222-2222-4222-8222-222222222222",
};
const RESPONSE = {
  "request_id": "r",
  "results": [{
    "id": "11111111-1111-4111-8111-111111111111",
    "title": "Invoice",
    "attachment_matches": [],
  }],
  "has_next_page": true,
  "next_page_cursor": "c2",
};

Deno.test("note-extended-search: POST /v2/notes/extended-search", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: RESPONSE }]);
  const out = await noteExtendedSearch.execute(INPUT, ctx) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/notes/extended-search");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(jsonBody(calls[0]), {
    "query": "invoice",
    "limit": 20,
    "sort_by": "DATE",
    "exclude_note_ids": [
      "11111111-1111-4111-8111-111111111111",
      "22222222-2222-4222-8222-222222222222",
    ],
  });
  assertEquals(calls[0].url.startsWith("https://api.mem.ai/"), true);
  assertEquals((out.items as unknown[]).length, 1);
  assertEquals(out.hasMore, true);
  assertEquals(out.nextPageCursor, "c2");
});

Deno.test("note-extended-search: puts no credential on the request (sign owns that)", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: RESPONSE }]);
  await noteExtendedSearch.execute(INPUT, ctx);
  assertEquals(calls[0].headers.authorization, undefined);
});

Deno.test("note-extended-search: a vendor error surfaces its own message", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: {
      error_category: "CLIENT_ERROR",
      error_metadata: { error_kind: "NOT_FOUND", message: "no such thing" },
    },
  }]);
  const err = await assertRejects(() =>
    Promise.resolve(noteExtendedSearch.execute(INPUT, ctx))
  ) as Error;
  assertEquals(err.message.includes("(404)"), true);
  assertEquals(err.message.includes("no such thing"), true);
});
