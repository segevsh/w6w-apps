import { assert, assertEquals } from "@std/assert";
import groupList from "../../actions/group-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = { "limit": 10, "offset": 0 } as Parameters<typeof groupList.execute>[0];

Deno.test("group-list: GET /api/groups with the documented fields", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "pagingMetadata": { "total": 1 }, "data": [{ "id": 17923 }] },
  }]);
  const out = await groupList.execute(INPUT, ctx) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/groups");
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(calls[0].headers["x-api-key"], undefined);
  assertEquals(queryOf(calls[0].url), { "limit": "10", "offset": "0" });
  assertEquals(calls[0].body, null);
  assertEquals((out.data as unknown[]).length, 1);
});

Deno.test("group-list: declares type read-or-search and every required param", () => {
  const required = (groupList.params ?? []).filter((p) => p.required).map((p) => p.key).sort();
  assertEquals(required, []);
  assert(["read", "search", "perform"].includes(groupList.type));
  assertEquals(groupList.type === "perform", false);
});

Deno.test("group-list: a refused key (bare code 900 in an HTTP 200) is thrown, not returned", async () => {
  const { ctx } = mockCtx([{ body: '"900"' }]);
  let message = "";
  try {
    await groupList.execute(INPUT, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assert(message.includes("900") && message.includes("authentication failed"), message);
});
