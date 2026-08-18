import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, paged, STATUS } from "./_shared.ts";
import action from "../../actions/timeline-public.ts";

const feed = paged([STATUS]);

Deno.test("timeline-public: reads the federated timeline by default", async () => {
  const { ctx, calls } = mockCtx([feed], { display });
  const result = await action.execute!({}, ctx) as { count: number };
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v1/timelines/public");
  assertEquals(url.searchParams.has("local"), false);
  assertEquals(url.searchParams.has("remote"), false);
  assertEquals(result.count, 1);
});

Deno.test("timeline-public: local and remote are separate scopes", async () => {
  const local = mockCtx([feed], { display });
  await action.execute!({ scope: "local" }, local.ctx);
  assertEquals(new URL(local.calls[0].url).searchParams.get("local"), "true");

  const remote = mockCtx([feed], { display });
  await action.execute!({ scope: "remote" }, remote.ctx);
  assertEquals(new URL(remote.calls[0].url).searchParams.get("remote"), "true");
});

Deno.test("timeline-public: a hashtag changes the path, and the # is stripped", async () => {
  const { ctx, calls } = mockCtx([feed], { display });
  await action.execute!({ hashtag: "#deno" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/v1/timelines/tag/deno");
});

Deno.test("timeline-public: the limit is clamped and paging ids passed", async () => {
  const { ctx, calls } = mockCtx([feed], { display });
  await action.execute!({ limit: 500, maxId: "50", minId: "10" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("limit"), "40");
  assertEquals(url.searchParams.get("max_id"), "50");
  assertEquals(url.searchParams.get("min_id"), "10");
});

Deno.test("timeline-public: logs the shape of the read, never the posts", async () => {
  const { ctx, logs } = mockCtx([feed], { display });
  await action.execute!({ hashtag: "deno", scope: "local" }, ctx);
  assert(!JSON.stringify(logs).includes("hello"), JSON.stringify(logs));
  assertEquals(logs[0].data, { count: 1, scope: "local", hashtag: true });
});

/** Neither scope is "the fediverse". */
Deno.test("timeline-public: says neither scope is the whole network", () => {
  assert(/neither is the whole network/.test(action.description!), action.description);
});
