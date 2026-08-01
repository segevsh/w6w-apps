import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/index-create.ts";

const display = { endpoint: "https://example.com:9200" };

Deno.test("index-create: PUTs /<index> with no body when nothing is configured", async () => {
  const { ctx, calls } = mockCtx([{ body: { acknowledged: true } }], { display });
  const result = await action.execute({ index: "my-index" }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(new URL(calls[0].url).pathname, "/my-index");
  assertEquals(calls[0].body, null);
  assertEquals(result, { acknowledged: true });
});

Deno.test("index-create: includes mappings/settings/aliases when given", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }], { display });
  await action.execute(
    {
      index: "my-index",
      mappings: { properties: { title: { type: "text" } } },
      settings: { number_of_shards: 1 },
      aliases: { "my-alias": {} },
    },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!), {
    mappings: { properties: { title: { type: "text" } } },
    settings: { number_of_shards: 1 },
    aliases: { "my-alias": {} },
  });
});
