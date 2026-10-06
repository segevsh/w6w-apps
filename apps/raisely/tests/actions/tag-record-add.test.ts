import { assertEquals } from "@std/assert";
import tagRecordAdd from "../../actions/tag-record-add.ts";
import { bodyOf, envelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("tag-record-add: POST /v3/tags/t-1/records with the documented wrapped body", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope([{ tagUuid: "t-1" }]) }]);
  const out = await tagRecordAdd.execute({ "uuid": "t-1", "records": "u1, u2" }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v3/tags/t-1/records");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(bodyOf(calls[0]), { "data": [{ "uuid": "u1" }, { "uuid": "u2" }] });
  assertEquals(out, [{ tagUuid: "t-1" }]);
});

Deno.test("tag-record-add: is a perform action marked idempotent=true", () => {
  assertEquals(tagRecordAdd.type, "perform");
  assertEquals(tagRecordAdd.idempotent, true);
});

Deno.test("tag-record-add: an empty record list is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  let message = "";
  try {
    await tagRecordAdd.execute({ uuid: "t-1", records: " , " }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message, "records must name at least one record uuid");
  assertEquals(calls.length, 0);
});

Deno.test("tag-record-add: accepts a multiselect array as well as a string", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope([]) }]);
  await tagRecordAdd.execute({ uuid: "t-1", records: ["a", "b"] }, ctx);
  assertEquals(bodyOf(calls[0]), { data: [{ uuid: "a" }, { uuid: "b" }] });
});

Deno.test("tag-record-add: an HTTP error becomes a readable Raisely error", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { code: "unauthorized", detail: "You must login again" },
  }]);
  let message = "";
  try {
    await tagRecordAdd.execute({ "uuid": "t-1", "records": "u1, u2" }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message.includes("Raisely 401"), true, message);
  assertEquals(message.includes("You must login again"), true, message);
});
