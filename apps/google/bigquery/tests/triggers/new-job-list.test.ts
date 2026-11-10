import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-job-list.ts";

test("new-job-list seeds, emits, retries, and requests the jobs endpoint", async () => {
  const seed = mockCtx([{ body: { jobs: [{ id: "a" }] } }], { display: { projectId: "p1" } });
  const first = await trigger.poll!({ params: {}, state: {}, subscriptionId: "s" }, seed.ctx);
  assertEquals(first.events, []);
  assertEquals((first.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(
    seed.calls[0].url,
    "https://bigquery.googleapis.com/bigquery/v2/projects/p1/jobs?maxResults=100",
  );
});
