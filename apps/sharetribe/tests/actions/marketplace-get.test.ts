import { assertEquals } from "@std/assert";
import marketplaceGet from "../../actions/marketplace-get.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("marketplace-get: GET /marketplace/show, no params, unwraps the resource", async () => {
  const { ctx, calls } = mockCtx([
    {
      status: 200,
      body: {
        data: { id: "mp-1", type: "marketplace", attributes: { name: "Acme", description: null } },
      },
    },
  ]);
  const result = await marketplaceGet.execute({}, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/integration_api/marketplace/show");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(result, {
    id: "mp-1",
    type: "marketplace",
    attributes: { name: "Acme", description: null },
  });
});
