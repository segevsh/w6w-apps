import { assertEquals } from "@std/assert";
import { mockSignCtx } from "../_helpers.ts";
import action from "../../actions/request-list.ts";

Deno.test("request-list: GET /requests with page_context carried as a data= query param", async () => {
  const { ctx, calls } = mockSignCtx([
    {
      body: {
        code: 0,
        status: "success",
        requests: [{ request_id: "r1" }],
        page_context: { total_count: 1, has_more_rows: false },
      },
    },
  ]);

  const out = await action.execute({ rowCount: 10, startIndex: 1, requestName: "NDA" }, ctx);

  const call = calls[0];
  const url = new URL(call.url);
  assertEquals(url.pathname, "/api/v1/requests");
  assertEquals(call.method, "GET");
  const data = JSON.parse(url.searchParams.get("data")!);
  assertEquals(data, {
    page_context: { row_count: 10, start_index: 1, search_columns: { request_name: "NDA" } },
  });
  assertEquals(out, {
    requests: [{ request_id: "r1" }],
    page_context: { total_count: 1, has_more_rows: false },
  });
});
