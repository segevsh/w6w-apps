import { assertEquals } from "@std/assert";
import { API, mockCtx, queryOf } from "../_helpers.ts";
import action from "../../actions/space-list.ts";

Deno.test("space-list: GETs /spaces", async () => {
  const { ctx, calls } = mockCtx([{ body: { records: [] } }]);
  await action.execute({}, ctx);
  assertEquals(calls[0].url, `${API}/spaces`);
});

Deno.test("space-list: forwards sort and pagination", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ sort: "alphabetical", page: 3, perPage: 25 }, ctx);
  assertEquals(queryOf(calls[0]), { sort: ["alphabetical"], page: ["3"], per_page: ["25"] });
});

Deno.test("space-list: offers Circle's own sort enum, which is not the post one", () => {
  const values = (action.params!.find((p) => p.key === "sort")!.options as Array<{ value: string }>)
    .map((o) => o.value);
  assertEquals(values, [
    "active",
    "oldest",
    "alphabetical",
    "likes",
    "latest_updated",
    "oldest_updated",
    "latest_profile_confirmed",
  ]);
});
