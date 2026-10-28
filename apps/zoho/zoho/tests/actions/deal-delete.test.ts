import { assertEquals } from "@std/assert";
import { mockZohoCtx } from "../_helpers.ts";
import action from "../../actions/deal-delete.ts";

Deno.test("deal-delete: DELETEs /Deals with the id in the `ids` query param", async () => {
  const { ctx, calls } = mockZohoCtx([
    { body: { data: [{ code: "SUCCESS", status: "success", details: { id: "1" } }] } },
  ]);
  await action.execute({ recordId: "1" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(url.searchParams.get("ids"), "1");
});
