import { assertEquals } from "@std/assert";
import listingGet from "../../actions/listing-get.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("listing-get: GET /listings/show?id=", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { data: { id: "l1", type: "listing", attributes: { title: "Bike" } } } },
  ]);
  const result = await listingGet.execute({ id: "l1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/integration_api/listings/show");
  assertEquals(queryOf(calls[0].url), { id: "l1" });
  assertEquals((result as { attributes: { title: string } }).attributes.title, "Bike");
});
