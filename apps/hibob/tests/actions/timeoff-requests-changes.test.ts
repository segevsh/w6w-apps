import { assertEquals, assertRejects } from "@std/assert";
import changes from "../../actions/timeoff-requests-changes.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("timeoff-requests-changes: passes since/to/includePending as query", async () => {
  const { ctx, calls } = mockCtx([{ body: { changes: [] } }]);
  await changes.execute(
    { since: "2026-10-01T00:00:00Z", to: "2026-10-05T00:00:00Z", includePending: true },
    ctx,
  );
  assertEquals(pathOf(calls[0].url), "/v1/timeoff/requests/changes");
  assertEquals(queryOf(calls[0].url), {
    since: "2026-10-01T00:00:00Z",
    to: "2026-10-05T00:00:00Z",
    includePending: "true",
  });
});

Deno.test("timeoff-requests-changes: since is required", async () => {
  const { ctx } = mockCtx();
  await assertRejects(() => Promise.resolve(changes.execute({ since: "" }, ctx)));
});
