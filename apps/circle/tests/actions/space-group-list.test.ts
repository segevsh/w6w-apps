import { assertEquals } from "@std/assert";
import { API, mockCtx, queryOf } from "../_helpers.ts";
import action from "../../actions/space-group-list.ts";

Deno.test("space-group-list: GETs /space_groups", async () => {
  const { ctx, calls } = mockCtx([{ body: { records: [] } }]);
  await action.execute({}, ctx);
  assertEquals(calls[0].url, `${API}/space_groups`);
});

Deno.test("space-group-list: forwards the name filter and pagination", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ name: "Community", page: 1, perPage: 100 }, ctx);
  assertEquals(queryOf(calls[0]), { name: ["Community"], page: ["1"], per_page: ["100"] });
});

Deno.test("space-group-list: a blank name filter is omitted, not sent empty", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ name: "" }, ctx);
  assertEquals(queryOf(calls[0]), {});
});
