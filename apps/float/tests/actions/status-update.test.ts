import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import statusUpdate from "../../actions/status-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("status-update - PATCHes /status/{id} and returns the {status: [...]} wrapper", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { status: [{ status_id: 1, status_name: "Renamed" }] },
  }]);
  const out = await statusUpdate.execute({ status_id: 1, statusName: "Renamed" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v3/status/1");
  assertEquals(JSON.parse(calls[0].body!), { status_name: "Renamed" });
  assertEquals(out, { status: [{ status_id: 1, status_name: "Renamed" }] });
});
