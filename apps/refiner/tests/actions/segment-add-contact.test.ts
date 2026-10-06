import { assert, assertEquals, assertRejects } from "@std/assert";
import segmentAddContact from "../../actions/segment-add-contact.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("segment-add-contact: POSTs /v1/sync-segment with id and segment", async () => {
  const { ctx, calls } = mockCtx([{
    body: { message: "ok", contact_uuid: "c1", segment_uuid: "s1" },
  }]);
  await segmentAddContact.execute({ id: "u1", segmentUuid: "s1" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/sync-segment");
  assertEquals(JSON.parse(calls[0].body!), { id: "u1", segment_uuid: "s1" });
});

Deno.test("segment-add-contact: accepts an email instead of an id", async () => {
  const { ctx, calls } = mockCtx([{ body: { message: "ok" } }]);
  await segmentAddContact.execute({ email: "a@b.co", segmentUuid: "s1" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { email: "a@b.co", segment_uuid: "s1" });
});

Deno.test("segment-add-contact: refuses a call with no user identifier, before any fetch", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    () => Promise.resolve(segmentAddContact.execute({ segmentUuid: "s1" }, ctx)),
    Error,
    "provide one of",
  );
  assertEquals(calls.length, 0);
});

Deno.test("segment-add-contact: a vendor error surfaces its own message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errorBody("API key does not look valid") }]);
  const err = await assertRejects(
    () => Promise.resolve(segmentAddContact.execute({ id: "u1", segmentUuid: "s1" }, ctx)),
    Error,
  );
  assert(err.message.includes("API key does not look valid"), err.message);
  assert(err.message.includes("401"), err.message);
});
