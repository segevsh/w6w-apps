import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/job-posting-list.ts";

const ok = (results: unknown) => ({ status: 200, body: { success: true, results } });

/** Unlisted postings are deliberately off the board index — often confidential. */
test("job-posting-list: excludes unlisted postings by default", async () => {
  const { ctx, calls } = mockCtx([ok([{ id: "jp1" }])]);
  const result = await action.execute!({}, ctx) as { count: number };
  assertEquals(calls[0].url, "https://api.ashbyhq.com/jobPosting.list");
  assertEquals(JSON.parse(calls[0].body!), { listedOnly: true });
  assertEquals(result.count, 1);
});

test("job-posting-list: drafts are opt-in and never on by accident", async () => {
  const { ctx, calls } = mockCtx([ok([])]);
  await action.execute!({ includeUnpublishedJobPostings: true }, ctx);
  assertEquals(JSON.parse(calls[0].body!).includeUnpublishedJobPostings, true);
});

test("job-posting-list: the location and department filters reach the wire", async () => {
  const { ctx, calls } = mockCtx([ok([])]);
  await action.execute!({ location: "Berlin", department: "Engineering" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.location, "Berlin");
  assertEquals(body.department, "Engineering");
});

/** "berlin" matches nothing and looks like an empty result rather than a typo. */
test("job-posting-list: warns that the name filters are case-sensitive", () => {
  assert(/case-SENSITIVE/i.test(action.description!), action.description);
});
