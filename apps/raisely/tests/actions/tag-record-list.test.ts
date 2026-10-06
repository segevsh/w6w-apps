import { assertEquals } from "@std/assert";
import tagRecordList from "../../actions/tag-record-list.ts";
import { listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("tag-record-list: GETs /tags/{uuid}/records with list params", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([{ uuid: "u1", tags: [] }]) }]);
  const out = await tagRecordList.execute(
    { uuid: "t-1", private: true, limit: 2, offset: 4 },
    ctx,
  ) as {
    data: unknown[];
  };

  assertEquals(pathOf(calls[0].url), "/v3/tags/t-1/records");
  assertEquals(queryOf(calls[0].url), { private: "true", limit: "2", offset: "4" });
  assertEquals(out.data.length, 1);
});

Deno.test("tag-record-list: a Raisely error body surfaces its code", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { code: "not found", detail: "No such tag" } }]);
  let message = "";
  try {
    await tagRecordList.execute({ uuid: "nope" }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message.includes("not found"), true, message);
});
