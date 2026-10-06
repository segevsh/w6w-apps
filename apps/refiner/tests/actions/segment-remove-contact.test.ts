import { assert, assertEquals, assertRejects } from "@std/assert";
import segmentRemoveContact from "../../actions/segment-remove-contact.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("segment-remove-contact: DELETEs /v1/sync-segment with query params", async () => {
  const { ctx, calls } = mockCtx([{ body: { message: "ok" } }]);
  await segmentRemoveContact.execute({ id: "u1", segmentUuid: "s1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v1/sync-segment");
  assertEquals(queryOf(calls[0].url), { id: "u1", segment_uuid: "s1" });
  assertEquals(calls[0].body, null);
});

Deno.test("segment-remove-contact: refuses a call with no user identifier", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    () => Promise.resolve(segmentRemoveContact.execute({ segmentUuid: "s1" }, ctx)),
    Error,
    "provide one of",
  );
  assertEquals(calls.length, 0);
});

Deno.test("segment-remove-contact: a vendor error surfaces its own message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errorBody("API key does not look valid") }]);
  const err = await assertRejects(
    () => Promise.resolve(segmentRemoveContact.execute({ id: "u1", segmentUuid: "s1" }, ctx)),
    Error,
  );
  assert(err.message.includes("API key does not look valid"), err.message);
  assert(err.message.includes("401"), err.message);
});
