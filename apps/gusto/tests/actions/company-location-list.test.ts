import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/company-location-list.ts";

const conn = { display: { environment: "production", companyId: "co-1" } };

Deno.test("company-location-list: reads the company's locations", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ uuid: "l1" }] }], conn);
  await action.execute!({}, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1/companies/co-1/locations");
});

/** Locations decide which state's tax applies. */
Deno.test("company-location-list: says why locations matter", () => {
  assert(/state taxes/i.test(action.description!), action.description);
});
