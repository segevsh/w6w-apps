import { assertEquals } from "@std/assert";
import vendorList from "../../actions/vendor-list.ts";
import { mockCtx, pathOf, queryAll } from "../_helpers.ts";

Deno.test("vendor-list: GET /v1/vendors with paging, returns { vendors, nextCursor }", async () => {
  const { ctx, calls } = mockCtx([{
    body: { vendors: [{ id: 1, name: "n" }], nextCursor: "c", nextPageUrl: "u" },
  }]);
  const out = await vendorList.execute({ limit: 25, cursor: "p1", organizationId: 2 }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/vendors");
  assertEquals(queryAll(calls[0].url), { limit: ["25"], cursor: ["p1"] });
  assertEquals(calls[0].headers["x-organization-id"], "2");
  assertEquals(out, { vendors: [{ id: 1, name: "n" }], nextCursor: "c" });
});
