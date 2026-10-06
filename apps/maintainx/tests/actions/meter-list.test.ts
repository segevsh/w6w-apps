import { assertEquals } from "@std/assert";
import meterList from "../../actions/meter-list.ts";
import { mockCtx, pathOf, queryAll } from "../_helpers.ts";

Deno.test("meter-list: GET /v1/meters with type, asset and expand filters", async () => {
  const { ctx, calls } = mockCtx([{
    body: { meters: [{ id: 1, name: "Hours" }], nextCursor: null },
  }]);
  const out = await meterList.execute(
    { measurementType: "MANUAL", assets: "3,4", expand: "last_reading" },
    ctx,
  );
  assertEquals(pathOf(calls[0].url), "/v1/meters");
  assertEquals(queryAll(calls[0].url), {
    measurementType: ["MANUAL"],
    assets: ["3", "4"],
    expand: ["last_reading"],
  });
  assertEquals(out, { meters: [{ id: 1, name: "Hours" }], nextCursor: null });
});
