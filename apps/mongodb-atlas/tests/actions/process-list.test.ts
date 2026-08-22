import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/process-list.ts";

const page = (versions: string[]) => ({
  status: 200,
  body: {
    results: [
      { id: "prod-00.abc.mongodb.net:27017", typeName: "REPLICA_PRIMARY", version: versions[0] },
      { id: "prod-01.abc.mongodb.net:27017", typeName: "REPLICA_SECONDARY", version: versions[1] },
      { id: "prod-02.abc.mongodb.net:27017", typeName: "REPLICA_SECONDARY", version: versions[2] },
    ],
    totalCount: 3,
  },
});

const steady = page(["8.0.4", "8.0.4", "8.0.4"]);

Deno.test("process-list: reads the project's processes", async () => {
  const { ctx, calls } = mockCtx([steady]);
  const result = await action.execute({ projectId: "5f8d0d55b54eff0f2b2c3d4e" }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(
    new URL(calls[0].url).pathname,
    "/api/atlas/v2/groups/5f8d0d55b54eff0f2b2c3d4e/processes",
  );
  assertEquals(result.count, 3);
});

/** The only place this API says which node is primary. */
Deno.test("process-list: names the primaries", async () => {
  const { ctx } = mockCtx([steady]);
  const result = await action.execute({ projectId: "5f8d0d55b54eff0f2b2c3d4e" }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(result.primaries, ["prod-00.abc.mongodb.net:27017"]);
  assert(/says so/.test(action.description!), action.description);
});

/** The ids are hostname:port, which is what the metrics endpoints take. */
Deno.test("process-list: returns ids in the shape the metrics endpoints want", async () => {
  const { ctx } = mockCtx([steady]);
  const result = await action.execute({ projectId: "5f8d0d55b54eff0f2b2c3d4e" }, ctx) as Record<
    string,
    unknown
  >;
  const ids = result.ids as string[];
  assertEquals(ids.length, 3);
  assert(ids.every((id) => /:\d+$/.test(id)), ids.join(","));
});

/** Several versions at once is a rolling upgrade, not a misconfiguration. */
Deno.test("process-list: mixed versions are flagged as an upgrade in progress", async () => {
  const mixed = mockCtx([page(["8.0.4", "8.0.4", "7.0.14"])]);
  const upgrading = await action.execute(
    { projectId: "5f8d0d55b54eff0f2b2c3d4e" },
    mixed.ctx,
  ) as Record<string, unknown>;
  assertEquals(upgrading.mixedVersions, true);
  assertEquals(upgrading.versions, ["7.0.14", "8.0.4"]);

  const same = mockCtx([steady]);
  const settled = await action.execute(
    { projectId: "5f8d0d55b54eff0f2b2c3d4e" },
    same.ctx,
  ) as Record<
    string,
    unknown
  >;
  assertEquals(settled.mixedVersions, false);
});

Deno.test("process-list: a project with no processes is not an error", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { results: [] } }]);
  const result = await action.execute({ projectId: "5f8d0d55b54eff0f2b2c3d4e" }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(result.count, 0);
  assertEquals(result.primaries, []);
  assertEquals(result.mixedVersions, false);
});

Deno.test("process-list: a mongos has no primary role and is not counted as one", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { results: [{ id: "m:27016", typeName: "SHARD_MONGOS", version: "8.0.4" }] },
  }]);
  const result = await action.execute({ projectId: "5f8d0d55b54eff0f2b2c3d4e" }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(result.primaries, []);
});
