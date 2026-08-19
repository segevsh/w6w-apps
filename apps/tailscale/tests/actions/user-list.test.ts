import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/user-list.ts";

const users = [
  { id: "1", loginName: "ada@example.com", role: "owner", status: "active", deviceCount: 4 },
  { id: "2", loginName: "grace@example.com", role: "member", status: "idle", deviceCount: 1 },
  { id: "3", loginName: "alan@example.com", role: "member", status: "suspended", deviceCount: 2 },
  { id: "4", loginName: "new@example.com", role: "member", status: "needs-approval" },
  { id: "5", loginName: "waiting@example.com", role: "member", status: "over-billing-limit" },
  { id: "6", loginName: "partner@other.com", role: "member", status: "active", type: "shared" },
];

Deno.test("user-list: asks for members of any role by default", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { users } }]);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(new URL(calls[0].url).pathname, "/api/v2/tailnet/-/users");
  assertEquals(new URL(calls[0].url).searchParams.get("type"), "member");
  assertEquals(new URL(calls[0].url).searchParams.get("role"), "all");
  assertEquals(result.count, 6);
});

/** A working login, no access, and nothing that says why. */
Deno.test("user-list: separates the two states that mean locked out, and warns", async () => {
  const { ctx, logs } = mockCtx([{ status: 200, body: { users } }]);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  const blocked = result.blocked as Array<{ user: string; status: string }>;
  assertEquals(blocked.map((b) => b.status), ["needs-approval", "over-billing-limit"]);
  assert(
    logs.some((l) => l.level === "warn" && /over the plan's user limit/.test(l.message)),
    JSON.stringify(logs),
  );
});

Deno.test("user-list: reports suspended, idle, admins and shared users apart", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { users } }]);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(result.suspended, ["alan@example.com"]);
  assertEquals(result.idle, ["grace@example.com"], "a licence paid for and not used");
  assertEquals(result.admins, [{ user: "ada@example.com", role: "owner" }]);
  assertEquals(result.sharedCount, 1);
});

Deno.test("user-list: maps device counts by login name", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { users } }]);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals((result.deviceCounts as Record<string, number>)["ada@example.com"], 4);
  assertEquals("new@example.com" in (result.deviceCounts as object), false);
});

Deno.test("user-list: the role and type filters reach the query", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { users: [] } }]);
  await action.execute({ type: "all", role: "admin" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("type"), "all");
  assertEquals(new URL(calls[0].url).searchParams.get("role"), "admin");
});

Deno.test("user-list: no blocked users means no warning", async () => {
  const { ctx, logs } = mockCtx([{ status: 200, body: { users: [users[0]] } }]);
  await action.execute({}, ctx);
  assertEquals(logs.length, 0);
});
