import { assertEquals } from "@std/assert";
import locationList from "../../actions/location-list.ts";
import { mockCtx, pathOf, queryAll } from "../_helpers.ts";

Deno.test("location-list: GET /v1/locations filtered by name", async () => {
  const { ctx, calls } = mockCtx([{
    body: { locations: [{ id: 1, name: "Plant" }], nextCursor: null },
  }]);
  const out = await locationList.execute({ name: "Plant", expand: "barcode" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/locations");
  assertEquals(queryAll(calls[0].url), { name: ["Plant"], expand: ["barcode"] });
  assertEquals(out, { locations: [{ id: 1, name: "Plant" }], nextCursor: null });
});
