import { assertEquals } from "@std/assert";
import { mockHighLevelCtx } from "../_helpers.ts";
import action from "../../actions/list-custom-fields.ts";

Deno.test("list-custom-fields: GETs /locations/:locationId/customFields", async () => {
  const { ctx, calls } = mockHighLevelCtx([{ body: { customFields: [] } }], "loc-1");
  await action.execute!({ model: "contact" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/locations/loc-1/customFields");
  assertEquals(url.searchParams.get("model"), "contact");
});
