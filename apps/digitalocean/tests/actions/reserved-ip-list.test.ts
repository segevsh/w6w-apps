import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/reserved-ip-list.ts";

const page = (entries: Array<[string, boolean]>) => ({
  status: 200,
  body: {
    reserved_ips: entries.map(([ip, assigned]) => ({
      ip,
      droplet: assigned ? { id: 1 } : null,
      region: { slug: "fra1" },
    })),
    meta: { total: entries.length },
  },
});

/** The inverse of every intuition about cloud billing. */
Deno.test("reserved-ip-list: counts the UNASSIGNED ones, which are the ones charged", async () => {
  const { ctx, logs } = mockCtx([page([
    ["203.0.113.1", true],
    ["203.0.113.2", false],
    ["203.0.113.3", false],
  ])]);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(result.assignedCount, 1);
  assertEquals(result.unassignedCount, 2);
  assertEquals(result.unassignedIps, ["203.0.113.2", "203.0.113.3"]);
  assertEquals(logs[0].level, "warn");
  assert(
    /an assigned reserved IP is free and an unassigned one is not/.test(logs[0].message),
    logs[0].message,
  );
});

Deno.test("reserved-ip-list: all assigned means nothing to warn about", async () => {
  const { ctx, logs } = mockCtx([page([["203.0.113.1", true]])]);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(result.unassignedCount, 0);
  assertEquals(logs.length, 0);
});

/** Destroying a droplet creates exactly the state that costs. */
Deno.test("reserved-ip-list: says destroying a droplet creates the billing state", () => {
  assert(/inverse of the usual rule/.test(action.description!), action.description);
  assert(
    /destroying a droplet creates that state automatically/.test(action.description!),
    action.description,
  );
});

Deno.test("reserved-ip-list: none is not an error", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { reserved_ips: [], meta: { total: 0 } } }]);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(result.count, 0);
  assertEquals(result.unassignedIps, []);
});
