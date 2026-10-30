import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/insight-list.ts";

const conn = { display: { region: "us", projectId: "999" } };

test("insight-list: GETs /api/projects/{id}/insights/", async () => {
  const { ctx, calls } = mockCtx(
    [{ body: { count: 0, results: [] } }],
    { connection: conn },
  );
  await action.execute!({}, ctx);
  assertEquals(calls[0].url, "https://us.posthog.com/api/projects/999/insights/");
});

test("insight-list: saved and insight type map to query params", async () => {
  const { ctx, calls } = mockCtx([{ body: { results: [] } }], { connection: conn });
  await action.execute!({ saved: true, insight: "TRENDS" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("saved"), "true");
  assertEquals(url.searchParams.get("insight"), "TRENDS");
});
