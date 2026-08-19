import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/state-outputs.ts";

const stateVersion = (outputs: Array<Record<string, unknown>>) => ({
  status: 200,
  body: {
    data: {
      type: "state-versions",
      id: "sv-1",
      attributes: { serial: 42, "created-at": "2026-08-18T10:00:00Z" },
    },
    included: outputs.map((attributes, i) => ({
      type: "state-version-outputs",
      id: `wsout-${i}`,
      attributes,
    })),
  },
});

const mixed = stateVersion([
  { name: "db_endpoint", type: "string", value: "db.internal:5432", sensitive: false },
  { name: "db_password", type: "string", value: null, sensitive: true },
  { name: "instance_count", type: "number", value: 3, sensitive: false },
]);

/** The outputs are sideloaded siblings, not children of the state version. */
Deno.test("state-outputs: reads the current state version with its outputs included", async () => {
  const { ctx, calls } = mockCtx([mixed]);
  const result = await action.execute({ workspaceId: "ws-1" }, ctx) as Record<string, unknown>;
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v2/workspaces/ws-1/current-state-version");
  assertEquals(url.searchParams.get("include"), "outputs");
  assertEquals(result.count, 3);
  assertEquals(result.serial, 42);
  assertEquals(result.createdAt, "2026-08-18T10:00:00Z");
});

/** This is the plug-and-play seam: name → value, ready to configure against. */
Deno.test("state-outputs: returns readable outputs as a plain name-to-value map", async () => {
  const { ctx } = mockCtx([mixed]);
  const result = await action.execute({ workspaceId: "ws-1" }, ctx) as Record<string, unknown>;
  assertEquals(result.outputs, { db_endpoint: "db.internal:5432", instance_count: 3 });
});

/** A workflow reading `undefined` should be able to tell why it is undefined. */
Deno.test("state-outputs: a sensitive output is named but its value is not carried", async () => {
  const { ctx } = mockCtx([mixed]);
  const result = await action.execute({ workspaceId: "ws-1" }, ctx) as Record<string, unknown>;
  assertEquals(result.sensitiveNames, ["db_password"]);
  assertEquals(result.sensitiveCount, 1);
  assertEquals((result.outputs as Record<string, unknown>).db_password, undefined);

  const details = result.details as Array<Record<string, unknown>>;
  const secret = details.find((entry) => entry.name === "db_password")!;
  assertEquals(secret.sensitive, true);
  assertEquals("value" in secret, false, "no value key at all, not a null one");
});

Deno.test("state-outputs: names can be narrowed to the ones a workflow wants", async () => {
  const { ctx } = mockCtx([mixed]);
  const result = await action.execute(
    { workspaceId: "ws-1", names: "db_endpoint, missing_one" },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(result.count, 1);
  assertEquals(result.names, ["db_endpoint"]);
});

/**
 * Terraform does not know what is secret: a connection string or a generated
 * password that nobody marked comes back in full.
 */
Deno.test("state-outputs: logs counts only, never a name or a value", async () => {
  const { ctx, logs } = mockCtx([mixed]);
  await action.execute({ workspaceId: "ws-1" }, ctx);
  const data = JSON.stringify(logs[0].data);
  assertEquals(data.includes("db.internal"), false);
  assertEquals(data.includes("db_endpoint"), false);
  assertEquals(logs[0].data, { workspaceId: "ws-1", count: 3, sensitiveCount: 1 });
  assert(/may still be secrets/.test(action.description!), action.description);
});

Deno.test("state-outputs: a workspace with no outputs is not an error", async () => {
  const { ctx } = mockCtx([stateVersion([])]);
  const result = await action.execute({ workspaceId: "ws-1" }, ctx) as Record<string, unknown>;
  assertEquals(result.count, 0);
  assertEquals(result.outputs, {});
  assertEquals(result.sensitiveNames, []);
});

/** A workspace that has never applied has no state version at all. */
Deno.test("state-outputs: a workspace with no state surfaces the 404", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { errors: [{ title: "not found" }] } }]);
  let message = "";
  try {
    await action.execute({ workspaceId: "ws-1" }, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/404/.test(message), message);
});

Deno.test("state-outputs: resolves a workspace named by organisation", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { data: { id: "ws-5", attributes: { name: "prod" } } } },
    mixed,
  ]);
  await action.execute({ organization: "acme", workspace: "prod" }, ctx);
  assertEquals(new URL(calls[1].url).pathname, "/api/v2/workspaces/ws-5/current-state-version");
});
