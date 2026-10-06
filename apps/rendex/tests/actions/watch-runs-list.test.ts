import { assertEquals, assertRejects } from "@std/assert";
import watchGet from "../../actions/watch-get.ts";
import watchRunsList from "../../actions/watch-runs-list.ts";
import watchRun from "../../actions/watch-run.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

const ok = () => mockCtx([{ body: envelope({ id: "w1" }) }]);

Deno.test("watch-get, watch-runs-list, watch-run: hit the documented per-watch paths", async () => {
  const g = ok();
  await watchGet.execute({ watchId: "w1" }, g.ctx);
  assertEquals([g.calls[0].method, pathOf(g.calls[0].url)], ["GET", "/v1/watches/w1"]);
  const r = ok();
  await watchRunsList.execute({ watchId: "w1" }, r.ctx);
  assertEquals([r.calls[0].method, pathOf(r.calls[0].url)], ["GET", "/v1/watches/w1/runs"]);
  const n = ok();
  await watchRun.execute({ watchId: "w1" }, n.ctx);
  assertEquals([n.calls[0].method, pathOf(n.calls[0].url)], ["POST", "/v1/watches/w1/run"]);
  assertEquals(n.calls[0].body, null);
  for (const a of [watchGet, watchRunsList, watchRun]) {
    await assertRejects(
      async () => await a.execute({ watchId: " " }, g.ctx),
      Error,
      "Watch ID is required",
    );
  }
});
