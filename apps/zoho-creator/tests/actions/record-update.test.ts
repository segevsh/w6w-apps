import { assertEquals } from "@std/assert";
import { mockCreatorCtx } from "../_helpers.ts";
import action from "../../actions/record-update.ts";

Deno.test("record-update: idempotent", () => {
  assertEquals(action.idempotent, true);
});

Deno.test("record-update: PATCHes /data/<owner>/<app>/report/<report> with criteria+data", async () => {
  const { ctx, calls } = mockCreatorCtx([
    {
      body: {
        result: [{
          code: 3000,
          data: { ID: "1", Status: "Closed" },
          message: "Data Updated Successfully!",
        }],
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
      data: { Status: "Closed" },
    },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(url.pathname, "/creator/v2/data/jason18/zylker-store/report/All_Orders");
  assertEquals(JSON.parse(calls[0].body!), {
    criteria: "ID!=0",
    data: { Status: "Closed" },
    result: { message: false, tasks: false },
  });
  assertEquals(out.results, [
    { code: 3000, data: { ID: "1", Status: "Closed" }, message: "Data Updated Successfully!" },
  ]);
  assertEquals(out.moreRecords, undefined);
});

Deno.test("record-update: surfaces moreRecords and sends process_until_limit", async () => {
  const { ctx, calls } = mockCreatorCtx([
    { body: { result: [], code: 3000, more_records: true } },
  ]);
  const out = await action.execute(
    {
      accountOwnerName: "jason18",
      appLinkName: "zylker-store",
      reportLinkName: "All_Orders",
      criteria: "ID!=0",
      data: { Status: "Closed" },
      processUntilLimit: true,
    },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("process_until_limit"), "true");
  assertEquals(out.moreRecords, true);
});
