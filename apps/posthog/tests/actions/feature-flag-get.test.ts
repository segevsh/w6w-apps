import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/feature-flag-get.ts";

const conn = { display: { region: "us", projectId: "999" } };

Deno.test("feature-flag-get: GETs /api/projects/{id}/feature_flags/{flagId}/", async () => {
  const { ctx, calls } = mockCtx(
    [{ body: { id: 7, key: "new-nav", active: true } }],
    { connection: conn },
  );
  const result = await action.execute!({ flagId: "7" }, ctx);
  assertEquals(calls[0].url, "https://us.posthog.com/api/projects/999/feature_flags/7/");
  assertEquals(result, { id: 7, key: "new-nav", active: true });
});

Deno.test("feature-flag-get: requires flagId", async () => {
  const { ctx, calls } = mockCtx([], { connection: conn });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "flagId");
  assertEquals(calls.length, 0);
});
