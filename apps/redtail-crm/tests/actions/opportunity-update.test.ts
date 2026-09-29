import { assertEquals } from "@std/assert";
import opportunityUpdate from "../../actions/opportunity-update.ts";
import { mockCtx, NO_CONTENT_204 } from "../_helpers.ts";

Deno.test("opportunity-update: PUTs /opportunities/:id — e.g. moving to a new stage", async () => {
  const { ctx, calls } = mockCtx([NO_CONTENT_204]);
  const out = await opportunityUpdate.execute({ opportunityId: 6, stageId: 9 }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(new URL(calls[0].url).pathname, "/api/public/v1/opportunities/6");
  assertEquals(JSON.parse(calls[0].body!), { stage_id: 9 });
  assertEquals(out, { updated: true });
});
