import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, paged, STATUS } from "./_shared.ts";
import action from "../../actions/timeline-home.ts";

const feed = paged([STATUS, { ...STATUS, id: "s2", content: "<p>second</p>" }]);

Deno.test("timeline-home: reads the feed and returns the paging ids", async () => {
  const { ctx, calls } = mockCtx([feed], { display });
  const result = await action.execute!({}, ctx) as {
    count: number;
    texts: string[];
    newestId: string;
    nextMinId: string;
  };
  assert(new URL(calls[0].url).pathname.endsWith("/api/v1/timelines/home"), calls[0].url);
  assertEquals(result.count, 2);
  assertEquals(result.texts, ["hello #tag", "second"]);
  assertEquals(result.newestId, "s1", "newest first, so the first entry is the high-water mark");
  assertEquals(result.nextMinId, "999");
});

/**
 * `min_id` walks forward without gaps; `since_id` drops the middle. Only the
 * first is offered, because there is no non-buggy use for the second here.
 */
Deno.test("timeline-home: offers minId and never since_id", async () => {
  const { ctx, calls } = mockCtx([feed], { display });
  await action.execute!({ minId: "500" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("min_id"), "500");
  assertEquals(url.searchParams.has("since_id"), false);

  const keys = (action.params as Array<{ key: string }>).map((p) => p.key);
  assert(!keys.includes("sinceId"), keys.join(","));
});

Deno.test("timeline-home: the limit is clamped and maxId passed", async () => {
  const { ctx, calls } = mockCtx([feed], { display });
  await action.execute!({ limit: 500, maxId: "50" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("limit"), "40");
  assertEquals(url.searchParams.get("max_id"), "50");
});

Deno.test("timeline-home: an empty timeline is a count of zero", async () => {
  const { ctx } = mockCtx([{ status: 200, body: [] }], { display });
  const result = await action.execute!({}, ctx) as { count: number; newestId?: string };
  assertEquals(result.count, 0);
  assertEquals(result.newestId, undefined);
});

Deno.test("timeline-home: logs a count, never the posts", async () => {
  const { ctx, logs } = mockCtx([feed], { display });
  await action.execute!({}, ctx);
  assert(!JSON.stringify(logs).includes("hello"), JSON.stringify(logs));
  assertEquals(logs[0].data, { count: 2 });
});

Deno.test("timeline-home: says which parameter 'since last run' wants", () => {
  assert(/walks forward without gaps/.test(action.description!), action.description);
});
