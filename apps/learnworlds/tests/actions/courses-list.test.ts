import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/courses-list.ts";

const conn = { display: { schoolDomain: "https://yourschool.learnworlds.com" } };

test("courses-list: GETs /v2/courses and forwards filters", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [], meta: {} } }], conn);
  await action.execute!({ categories: "a, b", access: "paid", page: 2 }, ctx);
  assertEquals(calls[0].method, "GET");
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/admin/api/v2/courses");
  assertEquals(url.searchParams.get("categories"), "a,b");
  assertEquals(url.searchParams.get("access"), "paid");
  assertEquals(url.searchParams.get("page"), "2");
});

test("courses-list: is a search action, read-only", () => {
  assertEquals(action.type, "search");
});
