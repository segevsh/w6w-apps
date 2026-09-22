import { assertEquals } from "@std/assert";
import action from "../../actions/list-tags.ts";
import { API_ROOT, mockCtx, page, queryOf, urlOf } from "../_helpers.ts";

const sample = page([{ id: "tag-1", name: "VIP" }], { count: 1 });

Deno.test("list-tags: reads /tags, not /consultant/tags", async () => {
  const { ctx, calls } = mockCtx([{ body: sample }]);
  const result = await action.execute({}, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(urlOf(calls[0]), `${API_ROOT}/tags`);
  assertEquals(result, sample);
});

Deno.test("list-tags: the shared pagination controls are passed through", async () => {
  const { ctx, calls } = mockCtx([{ body: sample }]);
  await action.execute({ limit: 100, skip: 0 }, ctx);
  const query = queryOf(calls[0].url);
  assertEquals(query.limit, "100");
  // `skip: 0` is a real value, not "unset".
  assertEquals(query.skip, "0");
});

Deno.test("list-tags: it is a plain page of tags", () => {
  assertEquals(action.type, "search");
  assertEquals(action.resource, "tag");
  assertEquals((action.output as Array<{ key: string }>).map((o) => o.key), [
    "count",
    "hasMore",
    "items",
  ]);
});
