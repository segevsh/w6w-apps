import { assertEquals } from "@std/assert";
import { mockDiscourseCtx, SITE_URL } from "../_helpers.ts";
import action from "../../actions/topic-list-latest.ts";

Deno.test("topic-list-latest: GETs /latest.json with no query when unconfigured", async () => {
  const { ctx, calls } = mockDiscourseCtx([{ body: { topic_list: { topics: [] } } }]);
  await action.execute({}, ctx);
  assertEquals(calls[0].url, `${SITE_URL}/latest.json`);
});

Deno.test("topic-list-latest: `ascending` goes on the wire as a STRING, per the schema", async () => {
  const { ctx, calls } = mockDiscourseCtx([{ body: {} }]);
  await action.execute({ order: "created", ascending: true, perPage: 25 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("order"), "created");
  // Discourse types this `string` with "add ascending=true to sort asc".
  assertEquals(url.searchParams.get("ascending"), "true");
  assertEquals(url.searchParams.get("per_page"), "25");
});

Deno.test("topic-list-latest: ascending=false is sent explicitly, not dropped", async () => {
  const { ctx, calls } = mockDiscourseCtx([{ body: {} }]);
  await action.execute({ ascending: false }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("ascending"), "false");
});

Deno.test("topic-list-latest: caps per_page at Discourse's documented 100", () => {
  const perPage = action.params!.find((p) => p.key === "perPage")!;
  assertEquals(perPage.validation?.max, 100);
  assertEquals(perPage.validation?.min, 1);
});

Deno.test("topic-list-latest: the order options are Discourse's own vocabulary", () => {
  const order = action.params!.find((p) => p.key === "order")!;
  const values = (order.options as { value: string }[]).map((o) => o.value);
  assertEquals(values, [
    "default",
    "created",
    "activity",
    "views",
    "posts",
    "category",
    "likes",
    "op_likes",
    "posters",
  ]);
});
