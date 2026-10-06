import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/record-list-related.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("record-list-related: sends GET /api/record/{n}/{id}/{related} and flattens the page", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      success: true,
      data: {
        PrimaryKey: "contactid",
        PrimaryField: "fullname",
        Total_Records: 1,
        Page_Size: 50,
        Page_Number: 1,
        Records: [{ contactid: "c1" }],
      },
    },
  }]);
  const out = await action.execute!(
    { objectNumber: 1, recordId: "a1", relatedObjectNumber: 2, pageSize: 10, pageNumber: 1 },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/record/1/a1/2");
  assertEquals(Object.fromEntries(url.searchParams), { pagesize: "10", pagenumber: "1" });
  assertEquals((out as { records: unknown[] }).records, [{ contactid: "c1" }]);
  assertEquals((out as { hasMore: boolean }).hasMore, false);
});

Deno.test("record-list-related: sends no tokenid header of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true, data: { Records: [] } } }]);
  await action.execute!({ objectNumber: 1, recordId: "a1", relatedObjectNumber: 2 }, ctx);
  assert(!("tokenid" in calls[0].headers));
});

Deno.test("record-list-related: surfaces vendor errors", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { Message: "Invalid Object Name" } }]);
  await assertRejects(
    async () =>
      await action.execute!({ objectNumber: 1, recordId: "a1", relatedObjectNumber: 2 }, ctx),
    Error,
    "Invalid Object Name",
  );
});

Deno.test("record-list-related: declares type and output", () => {
  assertEquals(action.type, "search");
  assert(Array.isArray(action.output) && action.output.length > 0);
});
