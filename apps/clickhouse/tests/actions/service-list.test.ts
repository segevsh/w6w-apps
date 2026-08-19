import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/service-list.ts";

const ORG = "11111111-2222-3333-4444-555555555555";
const D = { display: { organizationId: ORG, plane: "control" } };

const services = (list: Array<[string, string, boolean?]>) => ({
  status: 200,
  body: {
    result: list.map(([name, state, idleScaling], i) => ({
      id: `svc-${i}`,
      name,
      state,
      idleScaling: idleScaling ?? true,
    })),
  },
});

Deno.test("service-list: lists the organisation's services", async () => {
  const { ctx, calls } = mockCtx([services([["prod", "running"], ["dev", "idle"]])], D);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(calls[0].url, `https://api.clickhouse.cloud/v1/organizations/${ORG}/services`);
  assertEquals(result.count, 2);
  assertEquals(result.ids, ["svc-0", "svc-1"]);
});

/**
 * `idle` wakes on a query and `stopped` does not — the distinction a failed
 * query cannot make.
 */
Deno.test("service-list: counts running, idle and stopped separately", async () => {
  const { ctx } = mockCtx([services([
    ["a", "running"],
    ["b", "idle"],
    ["c", "stopped"],
    ["d", "idle"],
  ])], D);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(result.runningCount, 1);
  assertEquals(result.idleCount, 2);
  assertEquals(result.stoppedCount, 1);
  assert(
    /`idle` wakes on the next query while `stopped` does NOT/.test(action.description!),
    action.description,
  );
});

/** Idle scaling off means paying for compute around the clock. */
Deno.test("service-list: counts the services that bill continuously", async () => {
  const { ctx, logs } = mockCtx([services([
    ["prod", "running", false],
    ["dev", "idle", true],
  ])], D);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(result.alwaysOnCount, 1);
  assertEquals(logs[0].data, { count: 2, runningCount: 1, alwaysOnCount: 1 });
});

Deno.test("service-list: filters by name locally and returns the single id", async () => {
  const { ctx, calls } = mockCtx([services([["prod-eu", "running"], ["dev", "idle"]])], D);
  const result = await action.execute({ name: "PROD" }, ctx) as Record<string, unknown>;
  assertEquals(result.count, 1);
  assertEquals(result.id, "svc-0");
  // The API has no name filter, so it is not sent as one.
  assertEquals(new URL(calls[0].url).searchParams.get("name"), null);
});

Deno.test("service-list: an organisation with no services is not an error", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { result: [] } }], D);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(result.count, 0);
  assertEquals(result.alwaysOnCount, 0);
});

/** A query connection cannot manage services. */
Deno.test("service-list: a service connection is refused with the reason", async () => {
  const { ctx, calls } = mockCtx([], { display: { host: "https://x:8443", plane: "query" } });
  let message = "";
  try {
    await action.execute({}, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/SERVICE connection/.test(message), message);
  assertEquals(calls.length, 0);
});
