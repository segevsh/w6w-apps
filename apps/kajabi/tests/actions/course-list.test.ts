import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import courseList from "../../actions/course-list.ts";
import { collection, mockCtx, pathOf, queryOf } from "../_helpers.ts";

test("course-list: GETs the collection with every documented filter mapped", async () => {
  const { ctx, calls } = mockCtx([{ body: collection(["1"], "courses") }]);
  await courseList.execute({ siteId: "111", titleContains: "m", publishStatus: "published" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0]), "/v1/courses");
  const q = queryOf(calls[0]);
  assertEquals(q["filter[site_id]"], "111");
  assertEquals(q["filter[title_cont]"], "m");
  assertEquals(q["filter[publish_status_eq]"], "published");
});

test("course-list: sends no query at all when nothing is filled in", async () => {
  const { ctx, calls } = mockCtx([{ body: collection(["1"], "courses") }]);
  await courseList.execute({}, ctx);
  assertEquals(queryOf(calls[0]), {});
});
