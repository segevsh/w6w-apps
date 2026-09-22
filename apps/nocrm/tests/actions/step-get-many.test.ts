import { assertEquals } from "@std/assert";
import { mockNocrmCtx } from "../_helpers.ts";
import action from "../../actions/step-get-many.ts";

Deno.test("step-get-many: sends the documented direction", async () => {
  const { ctx, calls } = mockNocrmCtx([{ body: [{ id: 1189, pipeline_id: 25 }] }]);
  const page = await action.execute({ direction: "desc" }, ctx);
  assertEquals(calls[0].url, "https://acme.nocrm.io/api/v2/steps?direction=desc");
  assertEquals(page.items, [{ id: 1189, pipeline_id: 25 }]);
});

Deno.test("step-get-many: no direction when the caller leaves the vendor's default", async () => {
  const { ctx, calls } = mockNocrmCtx([{ body: [] }]);
  await action.execute({}, ctx);
  assertEquals(calls[0].url, "https://acme.nocrm.io/api/v2/steps");
});
