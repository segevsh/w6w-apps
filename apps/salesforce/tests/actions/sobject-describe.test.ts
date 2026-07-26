import { assertEquals } from "@std/assert";
import { mockSalesforceCtx } from "../_helpers.ts";
import action from "../../actions/sobject-describe.ts";

Deno.test("sobject-describe: GETs the object's describe resource", async () => {
  const { ctx, calls } = mockSalesforceCtx([{ body: { name: "Lead", fields: [] } }]);
  await action.execute({ sobject: "Lead" }, ctx);
  assertEquals(
    new URL(calls[0].url).pathname,
    "/services/data/v60.0/sobjects/Lead/describe",
  );
});
