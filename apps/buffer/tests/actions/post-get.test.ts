import { assert, assertEquals } from "@std/assert";
import { data, gqlOf, mockCtx } from "../_helpers.ts";
import postGet from "../../actions/post-get.ts";

Deno.test("post-get: PostInput takes only an id", async () => {
  const { ctx, calls } = mockCtx([data({ post: { id: "p1" } })]);
  await postGet.execute({ postId: "p1" }, ctx);
  assertEquals(gqlOf(calls[0]).variables, { input: { id: "p1" } });
});

Deno.test("post-get: metrics are NOT selected by default", async () => {
  const { ctx, calls } = mockCtx([data({ post: { id: "p1" } })]);
  await postGet.execute({ postId: "p1" }, ctx);
  assert(!/\bmetrics\b/.test(gqlOf(calls[0]).query));
});

Deno.test("post-get: opting in adds metrics and their freshness timestamp together", async () => {
  const { ctx, calls } = mockCtx([data({ post: { id: "p1" } })]);
  await postGet.execute({ postId: "p1", includeMetrics: true }, ctx);
  const { query } = gqlOf(calls[0]);
  assert(/metrics \{ type name description value unit \}/.test(query), query);
  // A number without its timestamp invites being read as live; Buffer refreshes
  // metrics once a day.
  assert(/metricsUpdatedAt/.test(query), query);
});

Deno.test("post-get: the metrics hint warns about the personal-key restriction", () => {
  const p = (postGet.params ?? []).find((p) => p.key === "includeMetrics")!;
  assert(/personal API key/i.test(String(p.hint)), String(p.hint));
});

Deno.test("post-get: Post.metadata is never selected — a twelve-network union", async () => {
  for (const includeMetrics of [false, true]) {
    const { ctx, calls } = mockCtx([data({ post: { id: "p1" } })]);
    await postGet.execute({ postId: "p1", includeMetrics }, ctx);
    assert(!/\bmetadata\b/.test(gqlOf(calls[0]).query), `includeMetrics=${includeMetrics}`);
  }
});

Deno.test("post-get: selects the publishing error, with the help link Buffer supplies", async () => {
  const { ctx, calls } = mockCtx([data({ post: { id: "p1" } })]);
  await postGet.execute({ postId: "p1" }, ctx);
  assert(/error \{ message supportUrl \}/.test(gqlOf(calls[0]).query));
});
