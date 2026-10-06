import { assertEquals, assertRejects } from "@std/assert";
import collectionAddNote from "../../actions/collection-add-note.ts";
import { jsonBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = {
  "collection_id": "22222222-2222-4222-8222-222222222222",
  "note_id": "11111111-1111-4111-8111-111111111111",
};
const RESPONSE = { "request_id": "r9" };

Deno.test("collection-add-note: PUT /v2/collections/{collection_id}/notes/{note_id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: RESPONSE }]);
  const out = await collectionAddNote.execute(INPUT, ctx) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "PUT");
  assertEquals(
    pathOf(calls[0].url),
    "/v2/collections/22222222-2222-4222-8222-222222222222/notes/11111111-1111-4111-8111-111111111111",
  );
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(jsonBody(calls[0]), null);
  assertEquals(calls[0].url.startsWith("https://api.mem.ai/"), true);
  assertEquals(out.ok, true);
});

Deno.test("collection-add-note: puts no credential on the request (sign owns that)", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: RESPONSE }]);
  await collectionAddNote.execute(INPUT, ctx);
  assertEquals(calls[0].headers.authorization, undefined);
});

Deno.test("collection-add-note: a vendor error surfaces its own message", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: {
      error_category: "CLIENT_ERROR",
      error_metadata: { error_kind: "NOT_FOUND", message: "no such thing" },
    },
  }]);
  const err = await assertRejects(() =>
    Promise.resolve(collectionAddNote.execute(INPUT, ctx))
  ) as Error;
  assertEquals(err.message.includes("(404)"), true);
  assertEquals(err.message.includes("no such thing"), true);
});
