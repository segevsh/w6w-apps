import { assertEquals } from "@std/assert";
import opportunityDelete from "../../actions/opportunity-delete.ts";
import { mockCtx, NO_CONTENT_204 } from "../_helpers.ts";

Deno.test("opportunity-delete: DELETEs /opportunities/:id", async () => {
  const { ctx, calls } = mockCtx([NO_CONTENT_204]);
  const out = await opportunityDelete.execute({ opportunityId: 6 }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/api/public/v1/opportunities/6");
  assertEquals(out, { deleted: true });
});
