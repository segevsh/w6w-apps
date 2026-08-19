import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/user-suspend.ts";

const active = {
  status: 200,
  body: { loginName: "alan@example.com", status: "active", role: "member", deviceCount: 3 },
};
const suspended = {
  status: 200,
  body: { loginName: "alan@example.com", status: "suspended", role: "member", deviceCount: 3 },
};
const ok = { status: 200, body: {} };

Deno.test("user-suspend: posts to suspend and reports the change", async () => {
  const { ctx, calls } = mockCtx([active, ok]);
  const result = await action.execute({ userId: "3" }, ctx) as Record<string, unknown>;
  assertEquals(new URL(calls[1].url).pathname, "/api/v2/users/3/suspend");
  assertEquals(calls[1].method, "POST");
  assertEquals(result.changed, true);
  assertEquals(result.loginName, "alan@example.com");
});

Deno.test("user-suspend: restoring hits the other endpoint", async () => {
  const { ctx, calls } = mockCtx([suspended, ok]);
  const result = await action.execute({ userId: "3", suspended: false }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(new URL(calls[1].url).pathname, "/api/v2/users/3/restore");
  assertEquals(result.changed, true);
  assertEquals(result.suspended, false);
});

Deno.test("user-suspend: suspending an already-suspended user changes nothing", async () => {
  const { ctx } = mockCtx([suspended, ok]);
  const result = await action.execute({ userId: "3" }, ctx) as Record<string, unknown>;
  assertEquals(result.changed, false);
});

/** The half of offboarding people miss. */
Deno.test("user-suspend: warns that their devices keep working", async () => {
  const { ctx, logs } = mockCtx([active, ok]);
  const result = await action.execute({ userId: "3" }, ctx) as Record<string, unknown>;
  assertEquals(result.deviceCount, 3);
  assert(
    logs.some((l) => l.level === "warn" && /up to 180 days/.test(l.message)),
    JSON.stringify(logs),
  );
});

Deno.test("user-suspend: a user with no devices gets no warning", async () => {
  const { ctx, logs } = mockCtx([
    { status: 200, body: { loginName: "x@example.com", status: "active", deviceCount: 0 } },
    ok,
  ]);
  await action.execute({ userId: "9" }, ctx);
  assertEquals(logs.length, 0);
});

Deno.test("user-suspend: restoring never warns about devices", async () => {
  const { ctx, logs } = mockCtx([suspended, ok]);
  await action.execute({ userId: "3", suspended: false }, ctx);
  assertEquals(logs.length, 0);
});

Deno.test("user-suspend: requires an id", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(async () => await action.execute({}, ctx), Error, "`userId` is required");
});
