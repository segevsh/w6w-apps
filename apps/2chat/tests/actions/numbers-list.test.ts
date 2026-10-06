import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import numbersList from "../../actions/numbers-list.ts";

Deno.test("numbers-list: filters by status", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "success": true, "count": 1, "page": 0, "numbers": [{ "uuid": "WPN1" }] },
  }]);
  await numbersList.execute!({ "status": "connected", "resultsPerPage": 20 } as never, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(
    calls[0].url,
    "https://api.p.2chat.io/open/whatsapp/get-numbers?status=connected&results_per_page=20&page_number=0",
  );
  assertEquals(calls[0].body, null);
});
