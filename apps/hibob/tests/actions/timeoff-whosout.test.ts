import { assertEquals, assertRejects } from "@std/assert";
import whosout from "../../actions/timeoff-whosout.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("timeoff-whosout: GETs with the date range and the true flags only", async () => {
  const { ctx, calls } = mockCtx([{ body: { outs: [] } }]);
  await whosout.execute(
    { from: "2026-10-01", to: "2026-10-31", includeHourly: true, includePrivate: false },
    ctx,
  );
  assertEquals(pathOf(calls[0].url), "/v1/timeoff/whosout");
  assertEquals(queryOf(calls[0].url), {
    from: "2026-10-01",
    to: "2026-10-31",
    includeHourly: "true",
  });
});

Deno.test("timeoff-whosout: rejects a malformed date", async () => {
  const { ctx } = mockCtx();
  await assertRejects(() =>
    Promise.resolve(whosout.execute({ from: "Oct 1", to: "2026-10-31" }, ctx))
  );
});
