import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/assign-subscriber-to-group.ts";

Deno.test("assign-subscriber-to-group: POSTs the subscriber-rooted path with no body", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { data: { id: "42" } } }]);
  const out = await action.execute!({ subscriberId: "31986843064993537", groupId: "42" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(
    new URL(calls[0].url).pathname,
    "/api/subscribers/31986843064993537/groups/42",
  );
  assertEquals(calls[0].body, null);
  assertEquals(out, { data: { id: "42" } });
});

Deno.test("assign-subscriber-to-group: is idempotent — 200 on an existing membership", async () => {
  assertEquals(action.idempotent, true);
  const { ctx } = mockCtx([{ status: 200, body: { data: { id: "42" } } }]);
  assertEquals(await action.execute!({ subscriberId: "1", groupId: "42" }, ctx), {
    data: { id: "42" },
  });
});

Deno.test("assign-subscriber-to-group: URL-encodes both path segments", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: {} } }]);
  await action.execute!({ subscriberId: "a b", groupId: "c/d" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/subscribers/a%20b/groups/c%2Fd");
});
