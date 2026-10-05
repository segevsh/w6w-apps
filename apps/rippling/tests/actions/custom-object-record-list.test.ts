import { assertEquals, assertRejects } from "@std/assert";
import { API_ROOT, listBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";
import customObjectRecordList from "../../actions/custom-object-record-list.ts";

Deno.test("custom-object-record-list: sends only limit and cursor, the two parameters this endpoint takes", async () => {
  const next = `${API_ROOT}/custom-objects/asset/records/?cursor=n2`;
  const { ctx, calls } = mockCtx([{ status: 200, body: listBody([{ id: "r1" }], next) }]);
  const out = await customObjectRecordList.execute(
    { customObjectApiName: "asset", limit: 10, cursor: "n1" },
    ctx,
  ) as Record<string, unknown>;

  assertEquals(pathOf(calls[0].url), "/custom-objects/asset/records/");
  assertEquals(queryOf(calls[0].url), { limit: "10", cursor: "n1" });
  assertEquals(out.nextCursor, "n2");
  assertEquals(customObjectRecordList.params!.map((p) => p.key), [
    "customObjectApiName",
    "limit",
    "cursor",
  ]);
});

Deno.test("custom-object-record-list: requires the object api name", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(
    () =>
      Promise.resolve().then(() =>
        customObjectRecordList.execute({ customObjectApiName: "" }, ctx)
      ),
    Error,
    "customObjectApiName is required",
  );
});
