import { assertEquals } from "@std/assert";
import trackerGet from "../../actions/tracker-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("tracker-get: fetches a single tracker by id", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "TRK1", name: "My Billboard", type: "source" } }]);
  const out = await trackerGet.execute({ accountId: "ACC1", trackerId: "TRK1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v3/a/ACC1/trackers/TRK1.json");
  assertEquals(out, { id: "TRK1", name: "My Billboard", type: "source" });
});
