import { assert, assertEquals } from "@std/assert";
import groupGet from "../../actions/group-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const INPUT = { "id": 17923 } as Parameters<typeof groupGet.execute>[0];

Deno.test("group-get: GET /api/groups/17923 with the documented fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 17923, "name": "A new group" } }]);
  const out = await groupGet.execute(INPUT, ctx) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/groups/17923");
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(calls[0].headers["x-api-key"], undefined);
  assertEquals(calls[0].body, null);
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(out.name, "A new group");
});

Deno.test("group-get: declares type read-or-search and every required param", () => {
  const required = (groupGet.params ?? []).filter((p) => p.required).map((p) => p.key).sort();
  assertEquals(required, ["id"]);
  assert(["read", "search", "perform"].includes(groupGet.type));
  assertEquals(groupGet.type === "perform", false);
});

Deno.test("group-get: a refused key (bare code 900 in an HTTP 200) is thrown, not returned", async () => {
  const { ctx } = mockCtx([{ body: '"900"' }]);
  let message = "";
  try {
    await groupGet.execute(INPUT, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assert(message.includes("900") && message.includes("authentication failed"), message);
});
