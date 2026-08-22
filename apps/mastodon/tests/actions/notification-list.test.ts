import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, paged, STATUS } from "./_shared.ts";
import action from "../../actions/notification-list.ts";

const feed = paged([
  { id: "n1", type: "mention", status: STATUS },
  { id: "n2", type: "follow", account: { acct: "bob" } },
  { id: "n3", type: "favourite", status: STATUS },
  { id: "n4", type: "follow", account: { acct: "carol" } },
]);

/** A follow carries no status at all, which is what breaks a naive walk. */
Deno.test("notification-list: counts the ones with no status separately", async () => {
  const { ctx } = mockCtx([feed], { display });
  const result = await action.execute!({}, ctx) as {
    count: number;
    withoutStatus: number;
    byType: Record<string, number>;
    texts: string[];
  };
  assertEquals(result.count, 4);
  assertEquals(result.withoutStatus, 2);
  assertEquals(result.byType, { mention: 1, follow: 2, favourite: 1 });
  assertEquals(result.texts, ["hello #tag", "hello #tag"], "only the ones that have a status");
});

Deno.test("notification-list: type filters reach the wire", async () => {
  const { ctx, calls } = mockCtx([feed], { display });
  await action.execute!({ types: "mention, follow", excludeTypes: "favourite" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("types[]"), "mention,follow");
  assertEquals(url.searchParams.get("exclude_types[]"), "favourite");
});

/** There is no read flag, so "what is new" is a paging question. */
Deno.test("notification-list: returns the high-water mark rather than marking anything", async () => {
  const { ctx, calls } = mockCtx([feed], { display });
  const result = await action.execute!({}, ctx) as { newestId: string; nextMinId: string };
  assertEquals(result.newestId, "n1");
  assertEquals(result.nextMinId, "999");
  assertEquals(calls.length, 1, "nothing was marked read");
});

Deno.test("notification-list: the limit is clamped and paging ids passed", async () => {
  const { ctx, calls } = mockCtx([feed], { display });
  await action.execute!({ limit: 500, minId: "10" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("limit"), "40");
  assertEquals(url.searchParams.get("min_id"), "10");
});

Deno.test("notification-list: logs counts, never the content", async () => {
  const { ctx, logs } = mockCtx([feed], { display });
  await action.execute!({}, ctx);
  assert(!JSON.stringify(logs).includes("hello"), JSON.stringify(logs));
  assertEquals(logs[0].data, { count: 4, byType: { mention: 1, follow: 2, favourite: 1 } });
});

Deno.test("notification-list: says Mastodon has no read flag", () => {
  assert(/NO read flag/.test(action.description!), action.description);
});
