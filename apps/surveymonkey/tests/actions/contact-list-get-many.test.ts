import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/contact-list-get-many.ts";

Deno.test("contact-list-get-many: GETs /contact_lists", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [], total: 0 } }]);
  await action.execute({ page: 1, perPage: 50 }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v3/contact_lists");
  assertEquals(url.searchParams.get("page"), "1");
  assertEquals(url.searchParams.get("per_page"), "50");
});
