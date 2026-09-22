import { assertEquals } from "@std/assert";
import { mockNocrmCtx } from "../_helpers.ts";
import action from "../../actions/lead-comment-get-many.ts";

Deno.test("lead-comment-get-many: GETs the lead's comments with a direction", async () => {
  const { ctx, calls } = mockNocrmCtx([{ body: [{ id: 13834 }] }]);
  const page = await action.execute({ leadId: "9402", direction: "asc" }, ctx);
  assertEquals(calls[0].url, "https://acme.nocrm.io/api/v2/leads/9402/comments?direction=asc");
  assertEquals(page.items, [{ id: 13834 }]);
});

Deno.test("lead-comment-get-many: sends no direction when the caller leaves it to the vendor", async () => {
  const { ctx, calls } = mockNocrmCtx([{ body: [] }]);
  await action.execute({ leadId: "9402" }, ctx);
  assertEquals(calls[0].url, "https://acme.nocrm.io/api/v2/leads/9402/comments");
});
