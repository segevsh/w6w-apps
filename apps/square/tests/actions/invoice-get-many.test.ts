import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/invoice-get-many.ts";

Deno.test("invoice-get-many: GETs /v2/invoices with the required location_id", async () => {
  const { ctx, calls } = mockCtx([{ body: { invoices: [] } }]);
  await action.execute({ locationId: "L1", limit: 50, cursor: "c" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/invoices");
  assertEquals(url.searchParams.get("location_id"), "L1");
  assertEquals(url.searchParams.get("limit"), "50");
  assertEquals(url.searchParams.get("cursor"), "c");
});

Deno.test("invoice-get-many: marks the location id required — Square's endpoint demands it", () => {
  const p = action.params?.find((p) => p.key === "locationId");
  assertEquals(p?.required, true);
  assert(/required/i.test(p?.hint ?? ""), p?.hint);
});
