import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/cluster-list.ts";

const page = {
  status: 200,
  body: {
    results: [
      { name: "prod", stateName: "IDLE", paused: false },
      { name: "staging", stateName: "IDLE", paused: true },
      { name: "scratch", stateName: "UPDATING", paused: false },
    ],
    totalCount: 3,
  },
};

Deno.test("cluster-list: reads the project's clusters at the current cluster version", async () => {
  const { ctx, calls } = mockCtx([page]);
  const result = await action.execute({ projectId: "5f8d0d55b54eff0f2b2c3d4e" }, ctx) as Record<
    string,
    unknown
  >;
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/atlas/v2/groups/5f8d0d55b54eff0f2b2c3d4e/clusters");
  // An older date returns the legacy shape, with different sizing fields.
  assertEquals(calls[0].headers["accept"], "application/vnd.atlas.2024-08-05+json");
  assertEquals(result.names, ["prod", "staging", "scratch"]);
});

/** Paused clusters keep their data and stop billing compute. */
Deno.test("cluster-list: counts the paused and the busy", async () => {
  const { ctx, logs } = mockCtx([page]);
  const result = await action.execute({ projectId: "5f8d0d55b54eff0f2b2c3d4e" }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(result.pausedCount, 1);
  assertEquals(result.busyCount, 1);
  assertEquals(logs[0].data, { count: 3, pausedCount: 1, busyCount: 1 });
});

/** IDLE is the only state that accepts a change. */
Deno.test("cluster-list: a cluster in any non-IDLE state counts as busy", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: {
      results: [
        { name: "a", stateName: "CREATING" },
        { name: "b", stateName: "DELETING" },
        { name: "c", stateName: "IDLE" },
      ],
    },
  }]);
  const result = await action.execute({ projectId: "5f8d0d55b54eff0f2b2c3d4e" }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(result.busyCount, 2);
});

/**
 * The omission this action exists to warn about: flex clusters live at their
 * own path and this response gives no sign of it.
 */
Deno.test("cluster-list: says flex clusters are not in here", () => {
  assert(
    /FLEX clusters are a separate endpoint and are NOT in here/.test(action.description!),
    action.description,
  );
});

Deno.test("cluster-list: a project with no clusters is not an error", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { results: [], totalCount: 0 } }]);
  const result = await action.execute({ projectId: "5f8d0d55b54eff0f2b2c3d4e" }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(result.count, 0);
  assertEquals(result.pausedCount, 0);
});

Deno.test("cluster-list: a malformed project id is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  let threw = false;
  try {
    await action.execute({ projectId: "prod" }, ctx);
  } catch {
    threw = true;
  }
  assert(threw);
  assertEquals(calls.length, 0);
});
