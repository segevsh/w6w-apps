import { assertEquals, assertRejects } from "@std/assert";
import collectionUpdate from "../../actions/collection-update.ts";
import { jsonBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = { "collection_id": "22222222-2222-4222-8222-222222222222", "title": "Trips" };
const RESPONSE = {
  "request_id": "r",
  "id": "22222222-2222-4222-8222-222222222222",
  "title": "Trips",
  "description": "Trips",
  "note_count": 3,
  "created_at": "2026-01-31T09:00:00Z",
  "updated_at": "2026-01-31T09:00:00Z",
};

Deno.test("collection-update: PATCH /v2/collections/{collection_id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: RESPONSE }]);
  const out = await collectionUpdate.execute(INPUT, ctx) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/v2/collections/22222222-2222-4222-8222-222222222222");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(jsonBody(calls[0]), { "title": "Trips" });
  assertEquals(calls[0].url.startsWith("https://api.mem.ai/"), true);
  assertEquals(out.title, "Trips");
});

Deno.test("collection-update: puts no credential on the request (sign owns that)", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: RESPONSE }]);
  await collectionUpdate.execute(INPUT, ctx);
  assertEquals(calls[0].headers.authorization, undefined);
});

Deno.test("collection-update: a vendor error surfaces its own message", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: {
      error_category: "CLIENT_ERROR",
      error_metadata: { error_kind: "NOT_FOUND", message: "no such thing" },
    },
  }]);
  const err = await assertRejects(() =>
    Promise.resolve(collectionUpdate.execute(INPUT, ctx))
  ) as Error;
  assertEquals(err.message.includes("(404)"), true);
  assertEquals(err.message.includes("no such thing"), true);
});
