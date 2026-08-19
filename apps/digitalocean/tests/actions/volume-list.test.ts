import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/volume-list.ts";

const page = (volumes: Array<[string, number, number[]]>) => ({
  status: 200,
  body: {
    volumes: volumes.map(([name, gb, droplets], i) => ({
      id: `vol-${i}`,
      name,
      size_gigabytes: gb,
      region: { slug: "fra1" },
      droplet_ids: droplets,
    })),
    meta: { total: volumes.length },
  },
});

Deno.test("volume-list: totals the gigabytes, which are all billing", async () => {
  const { ctx, calls } = mockCtx([page([["data", 100, [1]], ["logs", 50, [1]]])]);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(new URL(calls[0].url).pathname, "/v2/volumes");
  assertEquals(result.totalGb, 150);
  assertEquals(result.count, 2);
});

/** Empty droplet_ids is the whole check, and the archetypal waste. */
Deno.test("volume-list: counts the unattached volumes and their gigabytes", async () => {
  const { ctx, logs } = mockCtx([page([
    ["in-use", 100, [1]],
    ["orphan-a", 250, []],
    ["orphan-b", 500, []],
  ])]);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(result.unattachedCount, 2);
  assertEquals(result.unattachedGb, 750);
  assertEquals(logs[0].level, "warn");
  assert(/still billing per gigabyte/.test(logs[0].message), logs[0].message);
});

Deno.test("volume-list: an all-attached account does not warn", async () => {
  const { ctx, logs } = mockCtx([page([["data", 100, [1]]])]);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(result.unattachedCount, 0);
  assertEquals(logs.length, 0);
});

/** A volume can only attach to a droplet in its own region. */
Deno.test("volume-list: the region filter is sent, and the hint says why it matters", async () => {
  const { ctx, calls } = mockCtx([page([])]);
  await action.execute({ region: "fra1" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("region"), "fra1");
  const region = action.params!.find((p) => p.key === "region")!;
  assert(/only attach to a droplet in its own region/.test(region.hint!), region.hint);
});

Deno.test("volume-list: an account with no volumes is not an error", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { volumes: [], meta: { total: 0 } } }]);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(result.count, 0);
  assertEquals(result.unattachedGb, 0);
});
