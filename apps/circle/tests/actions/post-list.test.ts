import { assertEquals } from "@std/assert";
import { API, mockCtx, queryOf } from "../_helpers.ts";
import action from "../../actions/post-list.ts";

Deno.test("post-list: GETs /posts unfiltered when nothing is set", async () => {
  const { ctx, calls } = mockCtx([{ body: { records: [] } }]);
  await action.execute({}, ctx);
  assertEquals(calls[0].url, `${API}/posts`);
});

Deno.test("post-list: forwards every filter under Circle's own parameter names", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute(
    {
      spaceId: 1,
      spaceGroupId: 2,
      status: "published",
      searchText: "release",
      sort: "latest",
      page: 2,
      perPage: 30,
    },
    ctx,
  );
  assertEquals(queryOf(calls[0]), {
    space_id: ["1"],
    space_group_id: ["2"],
    status: ["published"],
    search_text: ["release"],
    sort: ["latest"],
    page: ["2"],
    per_page: ["30"],
  });
});

Deno.test("post-list: the status filter enum includes `all`, which the write enum does not", () => {
  const values = (action.params!.find((p) => p.key === "status")!.options as Array<
    { value: string }
  >).map((o) => o.value);
  assertEquals(values.sort(), ["all", "draft", "published", "scheduled"]);
});
