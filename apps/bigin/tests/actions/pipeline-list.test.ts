import { assertEquals } from "@std/assert";
import { mockBiginCtx } from "../_helpers.ts";
import action from "../../actions/pipeline-list.ts";

Deno.test("pipeline-list: GETs /bigin/v2/Pipelines with the documented query parameters", async () => {
  const { ctx, calls } = mockBiginCtx([{ body: { data: [{ id: "1" }], info: { count: 1 } } }]);
  await action.execute(
    {
      fields: "id,Deal_Name,Sub_Pipeline,Stage,Amount,Closing_Date,Account_Name,Contact_Name,Owner",
      page: 1,
      per_page: 200,
      sort_by: "Created_Time",
      sort_order: "desc",
    },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(url.pathname, "/bigin/v2/Pipelines");
  assertEquals(
    url.searchParams.get("fields"),
    "id,Deal_Name,Sub_Pipeline,Stage,Amount,Closing_Date,Account_Name,Contact_Name,Owner",
  );
  assertEquals(url.searchParams.get("per_page"), "200");
  assertEquals(url.searchParams.get("sort_by"), "Created_Time");
  assertEquals(url.searchParams.get("sort_order"), "desc");
});

Deno.test("pipeline-list: posts the cursor parameters for paging past 2000 records", async () => {
  const { ctx, calls } = mockBiginCtx([{ body: { data: [] } }]);
  await action.execute({ fields: "id", page_token: "tok", cvid: "view-1" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("page_token"), "tok");
  assertEquals(url.searchParams.get("cvid"), "view-1");
});
