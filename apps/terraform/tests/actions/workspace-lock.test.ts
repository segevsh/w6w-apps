import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/workspace-lock.ts";

const locked = {
  status: 200,
  body: {
    data: {
      type: "workspaces",
      id: "ws-1",
      attributes: { name: "prod", locked: true, "locked-reason": "database migration" },
    },
  },
};

Deno.test("workspace-lock: posts to the lock action with a reason", async () => {
  const { ctx, calls } = mockCtx([locked]);
  const result = await action.execute(
    { workspaceId: "ws-1", reason: "database migration" },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(calls[0].url, "https://app.terraform.io/api/v2/workspaces/ws-1/actions/lock");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!).data.attributes.reason, "database migration");
  assertEquals(result.locked, true);
  assertEquals(result.reason, "database migration");
});

/** Without one, nobody can decide whether the lock is still needed. */
Deno.test("workspace-lock: a reason is required and nothing is locked without one", async () => {
  for (const reason of [undefined, "", "   "]) {
    const { ctx, calls } = mockCtx([]);
    let message = "";
    try {
      await action.execute({ workspaceId: "ws-1", reason }, ctx);
    } catch (err) {
      message = String(err);
    }
    assert(/`reason` is required/.test(message), message);
    assertEquals(calls.length, 0);
  }
});

/** Runs are accepted and queue; the workflow waits for a state that never comes. */
Deno.test("workspace-lock: warns that runs will queue rather than fail", async () => {
  const { ctx, logs } = mockCtx([locked]);
  await action.execute({ workspaceId: "ws-1", reason: "maintenance" }, ctx);
  assertEquals(logs[0].level, "warn");
  assert(/runs will queue/.test(logs[0].message), logs[0].message);
  assert(/queue in `pending`/.test(action.description!), action.description);
});

Deno.test("workspace-lock: resolves a workspace named by organisation", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { data: { id: "ws-9", attributes: { name: "prod" } } } },
    locked,
  ]);
  await action.execute({ organization: "acme", workspace: "prod", reason: "x" }, ctx);
  assertEquals(calls[1].url, "https://app.terraform.io/api/v2/workspaces/ws-9/actions/lock");
});

/** Locking an already-locked workspace is a 409, not a no-op. */
Deno.test("workspace-lock: an existing lock surfaces the conflict", async () => {
  const { ctx } = mockCtx([{
    status: 409,
    body: { errors: [{ title: "conflict", detail: "workspace already locked" }] },
  }]);
  let message = "";
  try {
    await action.execute({ workspaceId: "ws-1", reason: "x" }, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/already locked/.test(message), message);
  assert(/A locked workspace/.test(message), message);
});

Deno.test("workspace-lock: is not idempotent, because a second lock is a conflict", () => {
  assertEquals(action.idempotent, false);
});
