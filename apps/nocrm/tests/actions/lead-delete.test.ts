import { assertEquals } from "@std/assert";
import { mockNocrmCtx } from "../_helpers.ts";
import action from "../../actions/lead-delete.ts";

Deno.test("lead-delete: DELETEs the lead and returns the vendor's id body", async () => {
  const { ctx, calls } = mockNocrmCtx([{ body: { id: 8113 } }]);
  const out = await action.execute({ leadId: "8113" }, ctx);
  assertEquals(calls[0].url, "https://acme.nocrm.io/api/v2/leads/8113");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].body, null);
  assertEquals(out, { id: 8113 });
});
