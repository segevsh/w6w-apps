import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/workspace-unlock.ts";

const unlocked = {
  status: 200,
  body: { data: { type: "workspaces", id: "ws-1", attributes: { name: "prod", locked: false } } },
};

Deno.test("workspace-unlock: posts to the ordinary unlock action", async () => {
  const { ctx, calls } = mockCtx([unlocked]);
  const result = await action.execute({ workspaceId: "ws-1" }, ctx) as Record<string, unknown>;
  assertEquals(calls[0].url, "https://app.terraform.io/api/v2/workspaces/ws-1/actions/unlock");
  assertEquals(result.locked, false);
  assertEquals(result.forced, false);
});

/** Two applies against one state file is how state gets corrupted. */
Deno.test("workspace-unlock: forcing needs an acknowledgement, and nothing is sent without it", async () => {
  const { ctx, calls } = mockCtx([]);
  let message = "";
  try {
    await action.execute({ workspaceId: "ws-1", force: true }, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/set `confirmForce`/.test(message), message);
  assert(/two applies against one state file/.test(message), message);
  assertEquals(calls.length, 0);
});

Deno.test("workspace-unlock: an acknowledged force uses the force-unlock endpoint", async () => {
  const { ctx, calls, logs } = mockCtx([unlocked]);
  const result = await action.execute(
    { workspaceId: "ws-1", force: true, confirmForce: true },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(
    calls[0].url,
    "https://app.terraform.io/api/v2/workspaces/ws-1/actions/force-unlock",
  );
  assertEquals(result.forced, true);
  assertEquals(logs[0].level, "warn");
  assert(/overriding whoever held the lock/.test(logs[0].message), logs[0].message);
});

Deno.test("workspace-unlock: an ordinary unlock logs at info", async () => {
  const { ctx, logs } = mockCtx([unlocked]);
  await action.execute({ workspaceId: "ws-1" }, ctx);
  assertEquals(logs[0].level, "info");
});

/** Releasing somebody else's lock is not something to do by accident. */
Deno.test("workspace-unlock: a lock held by another user surfaces the 409", async () => {
  const { ctx } = mockCtx([{
    status: 409,
    body: { errors: [{ title: "conflict", detail: "locked by another user" }] },
  }]);
  let message = "";
  try {
    await action.execute({ workspaceId: "ws-1" }, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/locked by another user/.test(message), message);
});

Deno.test("workspace-unlock: is idempotent, and says what force is for", () => {
  assertEquals(action.idempotent, true);
  assert(/how state gets corrupted/.test(action.description!), action.description);
});
