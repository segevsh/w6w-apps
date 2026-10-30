import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/feature-flag-list.ts";

const conn = { display: { region: "us", projectId: "999" } };

test("feature-flag-list: GETs /api/projects/{id}/feature_flags/", async () => {
  const { ctx, calls } = mockCtx(
    [{ body: { count: 0, results: [] } }],
    { connection: conn },
  );
  await action.execute!({}, ctx);
  assertEquals(calls[0].url, "https://us.posthog.com/api/projects/999/feature_flags/");
});

test("feature-flag-list: active/archived booleans map to query params", async () => {
  const { ctx, calls } = mockCtx([{ body: { results: [] } }], { connection: conn });
  await action.execute!({ active: true, archived: false }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("active"), "true");
  // `archived: false` is a real value, not "unset" — compact() only drops
  // undefined/null/"" so this must still be sent.
  assertEquals(url.searchParams.get("archived"), "false");
});
