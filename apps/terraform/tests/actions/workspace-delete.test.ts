import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/workspace-delete.ts";

const workspace = (resourceCount: number) => ({
  status: 200,
  body: {
    data: {
      type: "workspaces",
      id: "ws-1",
      attributes: { name: "prod", "resource-count": resourceCount },
    },
  },
});

/** Safe-delete answers 409 while resources exist — the case that orphans them. */
Deno.test("workspace-delete: uses safe-delete by default", async () => {
  const { ctx, calls } = mockCtx([workspace(12), { status: 200, body: {} }]);
  const result = await action.execute({ workspaceId: "ws-1" }, ctx) as Record<string, unknown>;
  assertEquals(
    calls[1].url,
    "https://app.terraform.io/api/v2/workspaces/ws-1/actions/safe-delete",
  );
  assertEquals(calls[1].method, "POST");
  assertEquals(result.forced, false);
  assertEquals(result.resourceCount, 12);
});

Deno.test("workspace-delete: a forced delete needs the name typed back", async () => {
  for (const confirm of [undefined, "", "PROD", "prod-old"]) {
    const { ctx, calls } = mockCtx([workspace(12)]);
    let message = "";
    try {
      await action.execute({ workspaceId: "ws-1", force: true, confirmName: confirm }, ctx);
    } catch (err) {
      message = String(err);
    }
    assert(/`confirmName` must match/.test(message), `${confirm}: ${message}`);
    assertEquals(calls.length, 1, "only the read happened");
  }
});

/** The count is in the refusal, because it is the size of the mistake. */
Deno.test("workspace-delete: the refusal says how many resources would be orphaned", async () => {
  const { ctx } = mockCtx([workspace(37)]);
  let message = "";
  try {
    await action.execute({ workspaceId: "ws-1", force: true, confirmName: "wrong" }, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/37 resources would be left running/.test(message), message);
});

Deno.test("workspace-delete: a confirmed force uses the plain DELETE and warns", async () => {
  const { ctx, calls, logs } = mockCtx([workspace(5), { status: 204 }]);
  const result = await action.execute(
    { workspaceId: "ws-1", force: true, confirmName: "prod" },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(calls[1].url, "https://app.terraform.io/api/v2/workspaces/ws-1");
  assertEquals(calls[1].method, "DELETE");
  assertEquals(result.forced, true);
  assertEquals(logs[0].level, "warn");
  assert(/now unmanaged/.test(logs[0].message), logs[0].message);
});

/**
 * The servers keep running, the bill keeps arriving, and nothing is left that
 * knows they were managed by Terraform.
 */
Deno.test("workspace-delete: says the infrastructure is not deleted", () => {
  assert(/INFRASTRUCTURE IS NOT DELETED/.test(action.description!), action.description);
  assert(/destroy run first/.test(action.description!), action.description);
});

Deno.test("workspace-delete: a safe-delete refused for resources surfaces the 409", async () => {
  const { ctx } = mockCtx([workspace(12), {
    status: 409,
    body: { errors: [{ title: "conflict", detail: "workspace is not safe to delete" }] },
  }]);
  let message = "";
  try {
    await action.execute({ workspaceId: "ws-1" }, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/not safe to delete/.test(message), message);
});
