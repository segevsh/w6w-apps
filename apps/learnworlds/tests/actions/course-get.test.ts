import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/course-get.ts";

const conn = { display: { schoolDomain: "https://yourschool.learnworlds.com" } };

test("course-get: GETs /v2/courses/{id} with the id URL-encoded", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "a b", title: "A" } }], conn);
  await action.execute!({ id: "a b" }, ctx);
  assertEquals(calls[0].url, "https://yourschool.learnworlds.com/admin/api/v2/courses/a%20b");
});
