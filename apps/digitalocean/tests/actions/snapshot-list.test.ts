import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/snapshot-list.ts";

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

const page = {
  status: 200,
  body: {
    snapshots: [
      {
        id: "s1",
        name: "pre-deploy",
        created_at: daysAgo(400),
        size_gigabytes: 25,
        resource_type: "droplet",
      },
      {
        id: "s2",
        name: "nightly",
        created_at: daysAgo(2),
        size_gigabytes: 25,
        resource_type: "droplet",
      },
      {
        id: "s3",
        name: "vol",
        created_at: daysAgo(10),
        size_gigabytes: 100,
        resource_type: "volume",
      },
    ],
    meta: { total: 3 },
  },
};

Deno.test("snapshot-list: totals the size and counts by type", async () => {
  const { ctx, calls } = mockCtx([page]);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(new URL(calls[0].url).pathname, "/v2/snapshots");
  assertEquals(result.totalGb, 150);
  assertEquals(result.byType, { droplet: 2, volume: 1 });
});

/** The oldest are usually the orphans; nothing flags a missing source. */
Deno.test("snapshot-list: names the oldest and how long it has been billing", async () => {
  const { ctx } = mockCtx([page]);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals((result.oldest as Record<string, unknown>).name, "pre-deploy");
  const age = Number(result.oldestAgeDays);
  assert(age >= 399 && age <= 401, `${age} days`);
  assert(/usually an orphan/.test(
    (action.output as Array<{ key: string; label: string }>).find((o) => o.key === "oldest")!.label,
  ));
});

Deno.test("snapshot-list: the type filter is passed through", async () => {
  const { ctx, calls } = mockCtx([page]);
  await action.execute({ resourceType: "volume" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("resource_type"), "volume");
});

/** Per gigabyte per month, with no expiry. */
Deno.test("snapshot-list: says snapshots have no expiry", () => {
  assert(/NO EXPIRY/.test(action.description!), action.description);
  assert(/nothing mentions them afterwards/.test(action.description!), action.description);
});

Deno.test("snapshot-list: no snapshots is not an error", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { snapshots: [], meta: { total: 0 } } }]);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(result.count, 0);
  assertEquals(result.oldest, undefined);
  assertEquals(result.oldestAgeDays, undefined);
});
