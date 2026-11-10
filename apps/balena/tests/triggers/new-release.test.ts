import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-release.ts";

const fleet = { body: { d: [{ id: 42, slug: "org/fleet" }] } };
const releases = (...ids: number[]) => ({
  body: { d: ids.map((id) => ({ id, status: "success", is_invalidated: false })) },
});

test("new-release seeds, emits, retries, and requests created_at desc for the fleet", async () => {
  const params = { fleet: "org/fleet" };
  const seed = await trigger.poll!({ params, state: {} }, mockCtx([fleet, releases(2, 1)]).ctx);
  assertEquals(seed.events, []);
  assertEquals((seed.nextState as { seeded: boolean }).seeded, true);
  const run = () => {
    const c = mockCtx([fleet, releases(3, 2, 1)]);
    return trigger.poll!({ params, state: seed.nextState }, c.ctx).then((r) => ({ r, c }));
  };
  const first = await run();
  assertEquals(first.r.events, [{ id: 3, status: "success", is_invalidated: false }]);
  assertEquals((await run()).r, first.r);
  assertEquals(first.c.calls.length, 2);
  assertEquals(first.c.calls[0].method, "GET");
  assertEquals(
    first.c.calls[1].url,
    "https://api.balena-cloud.com/v7/release?%24select=id%2Ccommit%2Craw_version%2Csemver%2Crevision%2Cstatus%2Cis_invalidated%2Ccreated_at%2Cend_timestamp&%24filter=belongs_to__application+eq+42&%24orderby=created_at+desc&%24top=50",
  );
});
