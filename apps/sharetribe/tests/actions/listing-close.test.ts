import { assertEquals } from "@std/assert";
import listingClose from "../../actions/listing-close.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("listing-close: POST /listings/close with just the id", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { data: { id: "l1", type: "listing", attributes: { state: "closed" } } } },
  ]);
  const result = await listingClose.execute({ id: "l1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/integration_api/listings/close");
  assertEquals(JSON.parse(calls[0].body ?? "{}"), { id: "l1" });
  assertEquals((result as { attributes: { state: string } }).attributes.state, "closed");
});

Deno.test("listing-close: declared idempotent", () => {
  assertEquals(listingClose.idempotent, true);
});
