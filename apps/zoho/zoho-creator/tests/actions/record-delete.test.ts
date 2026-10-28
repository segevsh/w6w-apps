import { assertEquals } from "@std/assert";
import { mockCreatorCtx } from "../_helpers.ts";
import action from "../../actions/record-delete.ts";

Deno.test("record-delete: idempotent", () => {
  assertEquals(action.idempotent, true);
});

Deno.test("record-delete: DELETEs /data/<owner>/<app>/report/<report> with a criteria body", async () => {
  const { ctx, calls } = mockCreatorCtx([
    {
      body: {
        result: [{ code: 3000, data: { ID: "1" }, message: "Record Deleted Successfully!" }],
        code: 3000,
      },
    },
  ]);
  const out = await action.execute(
    {
      accountOwnerName: "jason18",
      appLinkName: "zylker-store",
      reportLinkName: "All_Orders",
      criteria: 'Single_Line.contains("x")',
    },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(url.pathname, "/creator/v2/data/jason18/zylker-store/report/All_Orders");
  assertEquals(JSON.parse(calls[0].body!), {
    criteria: 'Single_Line.contains("x")',
    result: { message: false, tasks: false },
  });
  assertEquals(out.results, [
    { code: 3000, data: { ID: "1" }, message: "Record Deleted Successfully!" },
  ]);
});

Deno.test("record-delete: passes a mixed success/failure result array through as-is", async () => {
  const { ctx } = mockCreatorCtx([
    {
      body: {
        result: [
          { code: 3001, data: { ID: "1" }, error: ["Failed to Delete Data."] },
          { code: 3000, data: { ID: "2" }, message: "Record Deleted Successfully!" },
        ],
        code: 3000,
      },
    },
  ]);
  const out = await action.execute(
    {
      accountOwnerName: "jason18",
      appLinkName: "zylker-store",
      reportLinkName: "All_Orders",
      criteria: "ID!=0",
    },
    ctx,
  );
  assertEquals(out.results.length, 2);
  assertEquals(out.results[0].code, 3001);
  assertEquals(out.results[1].code, 3000);
});
