import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import serviceZoneList from "../../actions/service-zone-list.ts";
import { mockCtx, page, pathOf, queryOf } from "../_helpers.ts";

test("service-zone-list: calls GET /service_zones with the zip filter", async () => {
  const { ctx, calls } = mockCtx([{ body: page("service_zones", [{ id: "sz1" }]) }]);
  const out = await serviceZoneList.execute({ zipCode: "78701" }, ctx);

  assertEquals(pathOf(calls[0].url), "/service_zones");
  assertEquals(queryOf(calls[0].url), { zip_code: "78701" });
  assertEquals(out.items, [{ id: "sz1" }]);
});

test("service-zone-list: says the endpoint needs a partner credential", () => {
  assertEquals(serviceZoneList.description?.includes("integration-partner"), true);
});
