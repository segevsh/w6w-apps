import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/synonym-save.ts";

const display = { appId: "APPID" };

Deno.test("synonym-save: PUTs the synonym body as given", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { taskID: 1, id: "s1" } }], { display });
  await action.execute!({
    indexName: "products",
    objectID: "s1",
    synonym: '{"type":"synonym","synonyms":["sneaker","trainer"]}',
  }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(
    calls[0].url.split("?")[0],
    "https://appid.algolia.net/1/indexes/products/synonyms/s1",
  );
  assertEquals(JSON.parse(calls[0].body!), { type: "synonym", synonyms: ["sneaker", "trainer"] });
});

Deno.test("synonym-save: the synonym body is required", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ indexName: "p", objectID: "s1" }, ctx),
    Error,
    "`synonym`",
  );
  assertEquals(calls.length, 0);
});
