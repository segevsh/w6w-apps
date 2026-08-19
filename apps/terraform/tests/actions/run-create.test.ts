import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/run-create.ts";

const workspace = (autoApply: boolean) => ({
  status: 200,
  body: {
    data: { type: "workspaces", id: "ws-1", attributes: { name: "prod", "auto-apply": autoApply } },
  },
});

const queued = {
  status: 201,
  body: {
    data: {
      type: "runs",
      id: "run-1",
      attributes: { status: "pending" },
      relationships: { workspace: { data: { type: "workspaces", id: "ws-1" } } },
    },
  },
};

/** Plan-only cannot apply under any workspace setting. */
Deno.test("run-create: defaults to plan-only", async () => {
  const { ctx, calls } = mockCtx([workspace(true), queued]);
  const result = await action.execute({ workspaceId: "ws-1" }, ctx) as Record<string, unknown>;
  const attributes = JSON.parse(calls[1].body!).data.attributes;
  assertEquals(attributes["plan-only"], true);
  assertEquals(attributes["is-destroy"], false);
  assertEquals(result.planOnly, true);
  assertEquals(result.willAutoApply, false);
  assertEquals(action.params!.find((p) => p.key === "planOnly")!.default, true);
});

/** The workspace goes in relationships; putting it in attributes is a 422. */
Deno.test("run-create: puts the workspace in relationships, not attributes", async () => {
  const { ctx, calls } = mockCtx([workspace(false), queued]);
  await action.execute({ workspaceId: "ws-1" }, ctx);
  assertEquals(calls[1].url, "https://app.terraform.io/api/v2/runs");
  const body = JSON.parse(calls[1].body!);
  assertEquals(body.data.type, "runs");
  assertEquals(body.data.relationships.workspace.data, { type: "workspaces", id: "ws-1" });
  assertEquals(body.data.attributes.workspace, undefined);
});

/** Whether this call is dangerous is a property of the workspace. */
Deno.test("run-create: reads the workspace before submitting anything", async () => {
  const { ctx, calls } = mockCtx([workspace(true)]);
  let message = "";
  try {
    await action.execute({ workspaceId: "ws-1", planOnly: false }, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/set `confirmApplyable`/.test(message), message);
  assert(/has AUTO-APPLY on/.test(message), message);
  assertEquals(calls.length, 1, "the run was never created");
});

Deno.test("run-create: an applyable run on a manual workspace still needs the acknowledgement", async () => {
  const { ctx } = mockCtx([workspace(false)]);
  let message = "";
  try {
    await action.execute({ workspaceId: "ws-1", planOnly: false }, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/will hold it for confirmation/.test(message), message);
});

Deno.test("run-create: an acknowledged applyable run on auto-apply warns loudly", async () => {
  const { ctx, calls, logs } = mockCtx([workspace(true), queued]);
  const result = await action.execute(
    { workspaceId: "ws-1", planOnly: false, confirmApplyable: true },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(JSON.parse(calls[1].body!).data.attributes["plan-only"], false);
  assertEquals(result.willAutoApply, true);
  assertEquals(logs[0].level, "warn");
  assert(/it will not be confirmed/.test(logs[0].message), logs[0].message);
});

/** A destroy run plans the removal of every resource in state. */
Deno.test("run-create: a destroy run needs the workspace name typed back", async () => {
  for (const confirm of [undefined, "", "PROD", "prod2"]) {
    const { ctx, calls } = mockCtx([workspace(false)]);
    let message = "";
    try {
      await action.execute({ workspaceId: "ws-1", isDestroy: true, confirmDestroy: confirm }, ctx);
    } catch (err) {
      message = String(err);
    }
    assert(/`confirmDestroy` must match/.test(message), `${confirm}: ${message}`);
    assert(/every resource in this workspace's state/.test(message), message);
    assertEquals(calls.length, 1);
  }
});

Deno.test("run-create: a confirmed destroy is sent and warned about", async () => {
  const { ctx, calls, logs } = mockCtx([workspace(false), queued]);
  const result = await action.execute(
    { workspaceId: "ws-1", isDestroy: true, confirmDestroy: "prod" },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(JSON.parse(calls[1].body!).data.attributes["is-destroy"], true);
  assertEquals(result.isDestroy, true);
  assertEquals(logs[0].level, "warn");
  assert(/DESTROY run/.test(logs[0].message), logs[0].message);
});

Deno.test("run-create: targets and run variables are passed through", async () => {
  const { ctx, calls } = mockCtx([workspace(false), queued]);
  await action.execute({
    workspaceId: "ws-1",
    targetAddrs: "aws_instance.web, aws_db_instance.main",
    variables: '[{"key":"region","value":"eu-west-1"}]',
  }, ctx);
  const attributes = JSON.parse(calls[1].body!).data.attributes;
  assertEquals(attributes["target-addrs"], ["aws_instance.web", "aws_db_instance.main"]);
  assertEquals(attributes.variables, [{ key: "region", value: "eu-west-1" }]);
});

Deno.test("run-create: run variables must be a list", async () => {
  const { ctx } = mockCtx([workspace(false)]);
  let message = "";
  try {
    await action.execute({ workspaceId: "ws-1", variables: '{"region":"eu-west-1"}' }, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/must be an array/.test(message), message);
});

Deno.test("run-create: the message defaults to something a person can trace", async () => {
  const { ctx, calls } = mockCtx([workspace(false), queued]);
  await action.execute({ workspaceId: "ws-1", message: "  " }, ctx);
  assertEquals(JSON.parse(calls[1].body!).data.attributes.message, "Queued by a w6w workflow");
});

/** A run on a `local` workspace sits in pending forever. */
Deno.test("run-create: returns the run id and its starting status", async () => {
  const { ctx } = mockCtx([workspace(false), queued]);
  const result = await action.execute({ workspaceId: "ws-1" }, ctx) as Record<string, unknown>;
  assertEquals(result.id, "run-1");
  assertEquals(result.status, "pending");
  assertEquals(result.workspaceId, "ws-1");
  assertEquals(action.idempotent, false);
});
