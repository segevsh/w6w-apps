import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import wabaTemplatesList from "../../actions/waba-templates-list.ts";

Deno.test("waba-templates-list: lists templates with the WABA paging names", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "success": true, "templates": [], "total": 0, "next_page": null },
  }]);
  await wabaTemplatesList.execute!({ "phoneNumber": "+5215512345432", "limit": 50 } as never, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(
    calls[0].url,
    "https://api.p.2chat.io/open/waba/templates?phone_number=%2B5215512345432&page=0&limit=50",
  );
  assertEquals(calls[0].body, null);
});
