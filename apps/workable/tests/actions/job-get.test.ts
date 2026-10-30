import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockWorkableCtx } from "../_helpers.ts";
import action from "../../actions/job-get.ts";

test("job-get: GETs /jobs/:shortcode, URL-encoded", async () => {
  const { ctx, calls } = mockWorkableCtx([{ body: { id: "1", shortcode: "GROOV 003" } }]);
  const out = await action.execute({ shortcode: "GROOV 003" }, ctx);
  assertEquals(calls[0].url, "https://acme.workable.com/spi/v3/jobs/GROOV%20003");
  assertEquals(out, { id: "1", shortcode: "GROOV 003" });
});
