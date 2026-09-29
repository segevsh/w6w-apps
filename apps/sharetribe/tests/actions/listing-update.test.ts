import { assertEquals } from "@std/assert";
import listingUpdate from "../../actions/listing-update.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("listing-update: POST /listings/update, expand=true, only sends given fields", async () => {
  const { ctx, calls } = mockCtx([
    {
      status: 200,
      body: { data: { id: "l1", type: "listing", attributes: { description: "new" } } },
    },
  ]);
  await listingUpdate.execute({ id: "l1", description: "new" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/integration_api/listings/update");
  assertEquals(queryOf(calls[0].url), { expand: "true" });
  const body = JSON.parse(calls[0].body ?? "{}");
  assertEquals(body, { id: "l1", description: "new" });
});

Deno.test("listing-update: images param is split into an array", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: { id: "l1" } } }]);
  await listingUpdate.execute({ id: "l1", images: "img-1, img-2" }, ctx);
  const body = JSON.parse(calls[0].body ?? "{}");
  assertEquals(body.images, ["img-1", "img-2"]);
});
