import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/cluster-create.ts";

const created = {
  status: 201,
  body: {
    id: "c-1",
    name: "prod",
    stateName: "CREATING",
    terminationProtectionEnabled: true,
  },
};

const base = {
  projectId: "5f8d0d55b54eff0f2b2c3d4e",
  name: "prod",
  instanceSize: "M10",
  region: "EU_WEST_1",
};

Deno.test("cluster-create: posts to the project's clusters at the newest write version", async () => {
  const { ctx, calls } = mockCtx([created]);
  const result = await action.execute(base, ctx) as Record<string, unknown>;
  assertEquals(
    new URL(calls[0].url).pathname,
    "/api/atlas/v2/groups/5f8d0d55b54eff0f2b2c3d4e/clusters",
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/vnd.atlas.2024-10-23+json");
  assertEquals(result.stateName, "CREATING");
});

/** The nested three-deep shape, assembled from three flat parameters. */
Deno.test("cluster-create: assembles the single-region replication spec", async () => {
  const { ctx, calls } = mockCtx([created]);
  await action.execute(base, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.replicationSpecs, [{
    regionConfigs: [{
      providerName: "AWS",
      regionName: "EU_WEST_1",
      priority: 7,
      electableSpecs: { instanceSize: "M10", nodeCount: 3 },
    }],
  }]);
  assertEquals(body.clusterType, "REPLICASET");
});

/** There is no safe default for something that bills hourly. */
Deno.test("cluster-create: refuses without an instance size, and says why", async () => {
  const { ctx, calls } = mockCtx([]);
  let message = "";
  try {
    await action.execute({
      projectId: "5f8d0d55b54eff0f2b2c3d4e",
      name: "prod",
      region: "EU_WEST_1",
    }, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/bills hourly, so there is no default tier/.test(message), message);
  assertEquals(calls.length, 0);
});

/** Atlas defaults this off; a cluster nobody is watching should have it on. */
Deno.test("cluster-create: turns termination protection on by default", async () => {
  const { ctx, calls } = mockCtx([created]);
  await action.execute(base, ctx);
  assertEquals(JSON.parse(calls[0].body!).terminationProtectionEnabled, true);
  assertEquals(
    action.params!.find((p) => p.key === "terminationProtection")!.default,
    true,
  );
});

Deno.test("cluster-create: protection and backup are sent explicitly, false included", async () => {
  const { ctx, calls } = mockCtx([created]);
  await action.execute({ ...base, terminationProtection: false, backupEnabled: false }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.terminationProtectionEnabled, false);
  assertEquals(body.backupEnabled, false);
});

Deno.test("cluster-create: a raw replication spec replaces the flat parameters", async () => {
  const { ctx, calls } = mockCtx([created]);
  await action.execute({
    projectId: "5f8d0d55b54eff0f2b2c3d4e",
    name: "prod",
    replicationSpecs: '[{"regionConfigs":[{"providerName":"GCP","regionName":"EUROPE_WEST_1"}]}]',
  }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.replicationSpecs[0].regionConfigs[0].providerName, "GCP");
});

Deno.test("cluster-create: a raw spec must be an array", async () => {
  const { ctx, calls } = mockCtx([]);
  let message = "";
  try {
    await action.execute({ ...base, replicationSpecs: '{"regionConfigs":[]}' }, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/must be an array/.test(message), message);
  assertEquals(calls.length, 0);
});

/** Billing from creation, and it is not IDLE for minutes. */
Deno.test("cluster-create: warns about the bill and the wait", async () => {
  const { ctx, logs } = mockCtx([created]);
  await action.execute(base, ctx);
  assertEquals(logs[0].level, "warn");
  assert(/bills per hour from now/.test(logs[0].message), logs[0].message);
  assert(/minutes to become IDLE/.test(logs[0].message), logs[0].message);
});

Deno.test("cluster-create: a name and a region are required", async () => {
  for (
    const input of [
      { projectId: "5f8d0d55b54eff0f2b2c3d4e", instanceSize: "M10", region: "EU_WEST_1" },
      { projectId: "5f8d0d55b54eff0f2b2c3d4e", name: "prod", instanceSize: "M10" },
    ]
  ) {
    const { ctx, calls } = mockCtx([]);
    let threw = false;
    try {
      await action.execute(input, ctx);
    } catch {
      threw = true;
    }
    assert(threw, JSON.stringify(input));
    assertEquals(calls.length, 0);
  }
});

Deno.test("cluster-create: is not idempotent", () => {
  assertEquals(action.idempotent, false);
});
