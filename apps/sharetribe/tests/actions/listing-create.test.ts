import { assertEquals } from "@std/assert";
import listingCreate from "../../actions/listing-create.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("listing-create: POST /listings/create, expand=true, builds the body from params", async () => {
  const { ctx, calls } = mockCtx([
    {
      status: 200,
      body: { data: { id: "l1", type: "listing", attributes: { title: "Very good item" } } },
    },
  ]);
  const result = await listingCreate.execute(
    {
      title: "Very good item",
      authorId: "u1",
      state: "published",
      description: "Brand new track bike.",
      geolocation: { lat: 40.6, lng: -74.1 },
      price: { amount: 1590, currency: "USD" },
      publicData: '{"category":"track"}',
      images: "img-1,img-2",
    },
    ctx,
  );

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/integration_api/listings/create");
  assertEquals(queryOf(calls[0].url), { expand: "true" });
  const body = JSON.parse(calls[0].body ?? "{}");
  assertEquals(body.title, "Very good item");
  assertEquals(body.authorId, "u1");
  assertEquals(body.state, "published");
  assertEquals(body.geolocation, { lat: 40.6, lng: -74.1 });
  assertEquals(body.price, { amount: 1590, currency: "USD" });
  assertEquals(body.publicData, { category: "track" });
  assertEquals(body.images, ["img-1", "img-2"]);
  assertEquals((result as { id: string }).id, "l1");
});

Deno.test("listing-create: omits images and extended-data fields entirely when not given", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: { id: "l1" } } }]);
  await listingCreate.execute({ title: "x", authorId: "u1", state: "published" }, ctx);
  const body = JSON.parse(calls[0].body ?? "{}");
  assertEquals("images" in body, false);
  assertEquals("publicData" in body, false);
  assertEquals("privateData" in body, false);
  assertEquals("metadata" in body, false);
});
