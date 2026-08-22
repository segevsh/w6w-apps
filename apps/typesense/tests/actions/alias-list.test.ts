import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/alias-list.ts";

const D = { display: { host: "https://search.internal:8108" } };
const aliases = {
  status: 200,
  body: {
    aliases: [
      { name: "products", collection_name: "products_v3" },
      { name: "articles", collection_name: "articles_v1" },
    ],
  },
};

Deno.test("alias-list: returns each alias and what it points at", async () => {
  const { ctx, calls } = mockCtx([
    aliases,
    { status: 200, body: [{ name: "products_v3" }, { name: "articles_v1" }] },
  ], D);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(new URL(calls[0].url).pathname, "/aliases");
  assertEquals(result.count, 2);
  assertEquals(result.names, ["products", "articles"]);
  assertEquals(result.broken, []);
});

/** An alias outlives its collection and every search through it 404s. */
Deno.test("alias-list: flags an alias pointing at a collection that is gone", async () => {
  const { ctx, logs } = mockCtx([aliases, { status: 200, body: [{ name: "products_v3" }] }], D);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(result.broken, [{ alias: "articles", collection: "articles_v1" }]);
  assert(
    logs.some((l) => l.level === "warn" && /returns 404/.test(l.message)),
    JSON.stringify(logs),
  );
});

Deno.test("alias-list: takes no parameters", () => {
  assertEquals(action.params, []);
  assertEquals(action.type, "read");
});
