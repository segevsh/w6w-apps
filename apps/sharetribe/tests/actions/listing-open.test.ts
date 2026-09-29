import { assertEquals } from "@std/assert";
import listingOpen from "../../actions/listing-open.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("listing-open: POST /listings/open with just the id", async () => {
  const { ctx, calls } = mockCtx([
    {
      status: 200,
      body: { data: { id: "l1", type: "listing", attributes: { state: "published" } } },
    },
  ]);
  const result = await listingOpen.execute({ id: "l1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/integration_api/listings/open");
  assertEquals(JSON.parse(calls[0].body ?? "{}"), { id: "l1" });
  assertEquals((result as { attributes: { state: string } }).attributes.state, "published");
});
