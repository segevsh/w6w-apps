import { assertEquals, assertRejects } from "@std/assert";
import noteCreate from "../../actions/note-create.ts";
import { jsonBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = {
  "content": "# Trip plan\nFlights",
  "collection_ids": "22222222-2222-4222-8222-222222222222, ",
  "collection_titles": "Travel,Work",
};
const RESPONSE = {
  "request_id": "r1",
  "id": "11111111-1111-4111-8111-111111111111",
  "title": "Trip plan",
  "content": "# Trip plan\nFlights",
  "version": 1,
  "collection_ids": ["22222222-2222-4222-8222-222222222222"],
  "created_at": "2026-01-31T09:00:00Z",
  "updated_at": "2026-01-31T09:00:00Z",
};

Deno.test("note-create: POST /v2/notes", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: RESPONSE }]);
  const out = await noteCreate.execute(INPUT, ctx) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/notes");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(jsonBody(calls[0]), {
    "content": "# Trip plan\nFlights",
    "collection_ids": ["22222222-2222-4222-8222-222222222222"],
    "collection_titles": ["Travel", "Work"],
  });
  assertEquals(calls[0].url.startsWith("https://api.mem.ai/"), true);
  assertEquals(out.id, "11111111-1111-4111-8111-111111111111");
  assertEquals(out.version, 1);
});

Deno.test("note-create: puts no credential on the request (sign owns that)", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: RESPONSE }]);
  await noteCreate.execute(INPUT, ctx);
  assertEquals(calls[0].headers.authorization, undefined);
});

Deno.test("note-create: a vendor error surfaces its own message", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: {
      error_category: "CLIENT_ERROR",
      error_metadata: { error_kind: "NOT_FOUND", message: "no such thing" },
    },
  }]);
  const err = await assertRejects(() => Promise.resolve(noteCreate.execute(INPUT, ctx))) as Error;
  assertEquals(err.message.includes("(404)"), true);
  assertEquals(err.message.includes("no such thing"), true);
});
