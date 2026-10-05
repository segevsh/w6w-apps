import { assertEquals, assertRejects } from "@std/assert";
import get from "../../actions/data-table-get.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("data-table-get: encodes the key into the /v2 path", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "tbl_1", key: "my table" } }]);
  const out = await get.execute({ tableKey: "my table" }, ctx) as { id: string };
  assertEquals(pathOf(calls[0].url), "/v2/data-tables/my%20table");
  assertEquals(out.id, "tbl_1");
});

Deno.test("data-table-get: 404 Data table not found surfaces", async () => {
  const { ctx } = mockCtx([{ status: 404, body: errorBody("Data table not found") }]);
  await assertRejects(
    () => Promise.resolve(get.execute({ tableKey: "nope" }, ctx)),
    Error,
    "Data table not found",
  );
});
