import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/data-retention-get.ts";

Deno.test("data-retention-get: reads the singleton settings resource", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 200, body: { eventDataRetention: "FOURTEEN_MONTHS" } }],
    {
      display: { propertyId: "123" },
    },
  );
  const result = await action.execute!({}, ctx);
  assertEquals(
    calls[0].url,
    "https://analyticsadmin.googleapis.com/v1beta/properties/123/dataRetentionSettings",
  );
  assertEquals(result, { eventDataRetention: "FOURTEEN_MONTHS" });
});
