import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/dataset-list.ts";

const display = { projectId: "p1" };

Deno.test("dataset-list: lists a project's datasets and asks for only what it wants", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { datasets: [{ id: "p1:d1" }] } }], {
    display,
  });
  const result = await action.execute!({ limit: 5 }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/bigquery/v2/projects/p1/datasets");
  assertEquals(new URL(calls[0].url).searchParams.get("maxResults"), "5");
  assertEquals(result, [{ id: "p1:d1" }]);
});

/** Hidden datasets are the anonymous ones query caching creates — noise by default. */
Deno.test("dataset-list: hidden datasets are opt-in, and the label filter passes through", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { datasets: [] } }], { display });
  await action.execute!({ all: true, filter: "labels.team:analytics" }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("all"), "true");
  assertEquals(q.get("filter"), "labels.team:analytics");
});

Deno.test("dataset-list: returnAll follows the page token past the limit", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { datasets: [{ id: "a" }], nextPageToken: "t2" } },
    { status: 200, body: { datasets: [{ id: "b" }] } },
  ], { display });
  const result = await action.execute!({ returnAll: true, limit: 1 }, ctx) as unknown[];
  assertEquals(result.length, 2);
  assertEquals(new URL(calls[1].url).searchParams.get("pageToken"), "t2");
});

Deno.test("dataset-list: the project override beats the connection's default", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { datasets: [] } }], { display });
  await action.execute!({ projectId: "other" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/bigquery/v2/projects/other/datasets");
});
