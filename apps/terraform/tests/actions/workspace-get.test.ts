import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/workspace-get.ts";

const workspace = (attributes: Record<string, unknown>) => ({
  status: 200,
  body: { data: { type: "workspaces", id: "ws-1", attributes: { name: "prod", ...attributes } } },
});

Deno.test("workspace-get: reads by id without a lookup", async () => {
  const { ctx, calls } = mockCtx([workspace({ "auto-apply": false })]);
  const result = await action.execute({ workspaceId: "ws-1" }, ctx) as Record<string, unknown>;
  assertEquals(calls.length, 1);
  assertEquals(calls[0].url, "https://app.terraform.io/api/v2/workspaces/ws-1");
  assertEquals(result.name, "prod");
});

/** Resolving by name already fetched the record; asking twice is a waste. */
Deno.test("workspace-get: reads by organisation and name in a single request", async () => {
  const { ctx, calls } = mockCtx([workspace({ "auto-apply": false })]);
  await action.execute({ organization: "acme", workspace: "prod" }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].url, "https://app.terraform.io/api/v2/organizations/acme/workspaces/prod");
});

/** Every other decision in a workflow depends on this one. */
Deno.test("workspace-get: an auto-apply workspace is warned about", async () => {
  const { ctx, logs } = mockCtx([workspace({ "auto-apply": true })]);
  const result = await action.execute({ workspaceId: "ws-1" }, ctx) as Record<string, unknown>;
  assertEquals(result.autoApply, true);
  assertEquals(logs[0].level, "warn");
  assert(/AUTO-APPLIES/.test(logs[0].message), logs[0].message);

  const quiet = mockCtx([workspace({ "auto-apply": false })]);
  await action.execute({ workspaceId: "ws-1" }, quiet.ctx);
  assertEquals(quiet.logs.length, 0);
});

/** A run on a `local` workspace sits in pending waiting for nothing. */
Deno.test("workspace-get: surfaces the three attributes that decide whether a run runs", async () => {
  const { ctx } = mockCtx([workspace({
    "auto-apply": false,
    locked: true,
    "execution-mode": "local",
    "terraform-version": "1.9.8",
    "resource-count": 42,
  })]);
  const result = await action.execute({ workspaceId: "ws-1" }, ctx) as Record<string, unknown>;
  assertEquals(result.locked, true);
  assertEquals(result.executionMode, "local");
  assertEquals(result.terraformVersion, "1.9.8");
  assertEquals(result.resourceCount, 42);
});

Deno.test("workspace-get: an id in the wrong shape is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  let message = "";
  try {
    await action.execute({ workspaceId: "prod" }, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/should look like "ws-/.test(message), message);
  assertEquals(calls.length, 0);
});

Deno.test("workspace-get: the description names the three attributes", () => {
  assert(
    /`auto-apply`, `locked` and `execution-mode`/.test(action.description!),
    action.description,
  );
  assertEquals(action.type, "read");
});
