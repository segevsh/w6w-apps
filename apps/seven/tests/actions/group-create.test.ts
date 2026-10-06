import { assert, assertEquals } from "@std/assert";
import groupCreate from "../../actions/group-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const INPUT = { "name": "A new group" } as Parameters<typeof groupCreate.execute>[0];

Deno.test("group-create: POST /api/groups with the documented fields", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "id": 17923, "name": "A new group", "members_count": 0 },
  }]);
  const out = await groupCreate.execute(INPUT, ctx) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/groups");
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(calls[0].headers["x-api-key"], undefined);
  assertEquals(Object.fromEntries(new URLSearchParams(calls[0].body ?? "")), {
    "name": "A new group",
  });
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(out.id, 17923);
});

Deno.test("group-create: declares type perform and every required param", () => {
  const required = (groupCreate.params ?? []).filter((p) => p.required).map((p) => p.key).sort();
  assertEquals(required, ["name"]);
  assert(["read", "search", "perform"].includes(groupCreate.type));
  assertEquals(groupCreate.type, "perform");
});

Deno.test("group-create: a refused key (bare code 900 in an HTTP 200) is thrown, not returned", async () => {
  const { ctx } = mockCtx([{ body: '"900"' }]);
  let message = "";
  try {
    await groupCreate.execute(INPUT, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assert(message.includes("900") && message.includes("authentication failed"), message);
});
