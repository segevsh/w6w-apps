import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/school-students-list.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("school-students-list: sends the mapped query and shapes the output", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      "students": [{ "profile_url": "https://www.linkedin.com/in/a" }],
      "next_page": "https://enrichlayer.com/api/v2/school/students/?after=zz",
    },
  }]);
  const out = await action.execute!({
    "schoolUrl": "https://www.linkedin.com/school/stanford-university",
    "pageSize": 5,
    "studentStatus": "past",
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(url.origin + url.pathname, "https://enrichlayer.com/api/v2/school/students/");
  assertEquals(Object.fromEntries(url.searchParams), {
    "school_url": "https://www.linkedin.com/school/stanford-university",
    "page_size": "5",
    "student_status": "past",
  });
  assertEquals(calls[0].body, null);
  assertEquals(out, {
    "students": [{ "profile_url": "https://www.linkedin.com/in/a" }],
    "nextCursor": "zz",
  });
});

Deno.test("school-students-list: unset fields are not sent", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({} as never, ctx);
  assertEquals(new URL(calls[0].url).search, "");
});

Deno.test("school-students-list: a rejected key surfaces the vendor description", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { code: 401, description: "Invalid API key", name: "Unauthorized" },
  }]);
  await assertRejects(
    async () =>
      await action.execute!({
        "schoolUrl": "https://www.linkedin.com/school/stanford-university",
        "pageSize": 5,
        "studentStatus": "past",
      }, ctx),
    Error,
    "HTTP 401 — Invalid API key (Unauthorized)",
  );
});
