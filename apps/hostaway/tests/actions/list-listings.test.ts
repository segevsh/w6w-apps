import { assertEquals, assertRejects } from "@std/assert";
import { envelope, mockCtx } from "../_helpers.ts";
import action from "../../actions/list-listings.ts";

Deno.test("list-listings: GETs /v1/listings with only the supplied filters", async () => {
  const { ctx, calls } = mockCtx([envelope([{ id: 40160 }], { count: 1, page: 1, totalPages: 1 })]);
  const page = await action.execute(
    { limit: 10, offset: 0, city: "Bremerhaven", sortOrder: "name" },
    ctx,
  ) as { items: unknown[]; count: number };

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1/listings");
  assertEquals(url.searchParams.get("limit"), "10");
  assertEquals(url.searchParams.get("offset"), "0");
  assertEquals(url.searchParams.get("city"), "Bremerhaven");
  assertEquals(url.searchParams.get("sortOrder"), "name");
  assertEquals(url.searchParams.has("match"), false);
  assertEquals(page.items, [{ id: 40160 }]);
  assertEquals(page.count, 1);
});

Deno.test("list-listings: surfaces Hostaway's own failure envelope", async () => {
  const { ctx } = mockCtx([{ status: 403, body: { status: "fail", message: "denied" } }]);
  await assertRejects(() => Promise.resolve(action.execute({}, ctx)), Error, "denied");
});
