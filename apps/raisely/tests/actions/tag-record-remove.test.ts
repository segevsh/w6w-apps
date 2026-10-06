import { assertEquals } from "@std/assert";
import tagRecordRemove from "../../actions/tag-record-remove.ts";
import { envelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("tag-record-remove: DELETE /v3/tags/t-1/records/u1 with the documented wrapped body", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope([{ tagUuid: "t-1" }]) }]);
  const out = await tagRecordRemove.execute({ "uuid": "t-1", "recordUuid": "u1" }, ctx);

  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v3/tags/t-1/records/u1");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body, null);
  assertEquals(out, [{ tagUuid: "t-1" }]);
});

Deno.test("tag-record-remove: is a perform action marked idempotent=true", () => {
  assertEquals(tagRecordRemove.type, "perform");
  assertEquals(tagRecordRemove.idempotent, true);
});

Deno.test("tag-record-remove: an HTTP error becomes a readable Raisely error", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { code: "unauthorized", detail: "You must login again" },
  }]);
  let message = "";
  try {
    await tagRecordRemove.execute({ "uuid": "t-1", "recordUuid": "u1" }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message.includes("Raisely 401"), true, message);
  assertEquals(message.includes("You must login again"), true, message);
});
