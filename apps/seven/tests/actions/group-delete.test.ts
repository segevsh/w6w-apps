import { assert, assertEquals } from "@std/assert";
import groupDelete from "../../actions/group-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const INPUT = { "id": 17923, "delete_contacts": false } as Parameters<
  typeof groupDelete.execute
>[0];

Deno.test("group-delete: DELETE /api/groups/17923 with the documented fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, headers: {}, body: "" }]);
  const out = await groupDelete.execute(INPUT, ctx) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/api/groups/17923");
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(calls[0].headers["x-api-key"], undefined);
  assertEquals(Object.fromEntries(new URLSearchParams(calls[0].body ?? "")), {
    "delete_contacts": "0",
  });
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(out.deleted, true);
});

Deno.test("group-delete: declares type perform and every required param", () => {
  const required = (groupDelete.params ?? []).filter((p) => p.required).map((p) => p.key).sort();
  assertEquals(required, ["id"]);
  assert(["read", "search", "perform"].includes(groupDelete.type));
  assertEquals(groupDelete.type, "perform");
});

Deno.test("group-delete: a refused key (bare code 900 in an HTTP 200) is thrown, not returned", async () => {
  const { ctx } = mockCtx([{ body: '"900"' }]);
  let message = "";
  try {
    await groupDelete.execute(INPUT, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assert(message.includes("900") && message.includes("authentication failed"), message);
});
