import { assert, assertEquals } from "@std/assert";
import groupUpdate from "../../actions/group-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const INPUT = { "id": 17923, "name": "New group name" } as Parameters<
  typeof groupUpdate.execute
>[0];

Deno.test("group-update: PATCH /api/groups/17923 with the documented fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 17923, "name": "New group name" } }]);
  const out = await groupUpdate.execute(INPUT, ctx) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/api/groups/17923");
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(calls[0].headers["x-api-key"], undefined);
  assertEquals(Object.fromEntries(new URLSearchParams(calls[0].body ?? "")), {
    "name": "New group name",
  });
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(out.name, "New group name");
});

Deno.test("group-update: declares type perform and every required param", () => {
  const required = (groupUpdate.params ?? []).filter((p) => p.required).map((p) => p.key).sort();
  assertEquals(required, ["id", "name"]);
  assert(["read", "search", "perform"].includes(groupUpdate.type));
  assertEquals(groupUpdate.type, "perform");
});

Deno.test("group-update: a refused key (bare code 900 in an HTTP 200) is thrown, not returned", async () => {
  const { ctx } = mockCtx([{ body: '"900"' }]);
  let message = "";
  try {
    await groupUpdate.execute(INPUT, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assert(message.includes("900") && message.includes("authentication failed"), message);
});
