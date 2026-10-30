import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import propertyImagesList from "../../actions/property-images-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("property-images-list: GET .../images", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [{ url: "https://i" }] } }]);
  await propertyImagesList.execute({ uuid: "p1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/properties/p1/images");
});
