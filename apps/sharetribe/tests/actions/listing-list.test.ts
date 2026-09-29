import { assertEquals } from "@std/assert";
import listingList from "../../actions/listing-list.ts";
import { listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("listing-list: GET /listings/query with filters", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: listEnvelope([{ id: "l1" }]) }]);
  await listingList.execute(
    { authorId: "u1", states: "published,closed", price: "1400,1600" },
    ctx,
  );
  assertEquals(pathOf(calls[0].url), "/v1/integration_api/listings/query");
  assertEquals(queryOf(calls[0].url), {
    authorId: "u1",
    states: "published,closed",
    price: "1400,1600",
  });
});

Deno.test("listing-list: keywords and pagination pass through", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: listEnvelope([]) }]);
  await listingList.execute({ keywords: "bike", page: 2, perPage: 25 }, ctx);
  assertEquals(queryOf(calls[0].url), { keywords: "bike", page: "2", perPage: "25" });
});
