import { assertEquals } from "@std/assert";
import action from "../../actions/tag-list.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("tag-list: GETs /tags", async () => {
  const { ctx, calls } = mockCtx([{ body: { list_count: 1, list: [{ tag_id: 1 }] } }]);
  const out = await action.execute!({}, ctx);
  assertEquals(calls[0].url, "https://public-api.ringover.com/v2/tags");
  assertEquals(out, { tags: [{ tag_id: 1 }], count: 1 });
});

Deno.test("tag-list: a 204 is an empty list", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  assertEquals(await action.execute!({}, ctx), { tags: [], count: 0 });
});
