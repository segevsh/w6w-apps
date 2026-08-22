import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, ok } from "./_shared.ts";
import action from "../../actions/alias-list.ts";

Deno.test("alias-list: reads the aliases out of the envelope", async () => {
  const { ctx, calls } = mockCtx([
    ok({
      aliases: [
        { alias_name: "docs", collection_name: "docs_v3" },
        { alias_name: "faqs", collection_name: "faqs_v1" },
      ],
    }),
  ], { display });
  const result = await action.execute!({}, ctx) as { count: number };
  assertEquals(calls[0].url, "https://xyz.cloud.qdrant.io:6333/aliases");
  assertEquals(result.count, 2);
});

Deno.test("alias-list: no aliases is a count of zero", async () => {
  const { ctx } = mockCtx([ok({ aliases: [] })], { display });
  assertEquals(await action.execute!({}, ctx), { aliases: [], count: 0 });
});

Deno.test("alias-list: a missing aliases field does not become undefined.length", async () => {
  const { ctx } = mockCtx([ok({})], { display });
  assertEquals(await action.execute!({}, ctx), { aliases: [], count: 0 });
});

/**
 * A collection with no alias pointing at it looks unused; one behind an alias
 * is what every reader is actually querying.
 */
Deno.test("alias-list: says why an unused-looking collection may not be", () => {
  assert(/may not be/.test(action.description!), action.description);
  assertEquals(action.params?.length ?? 0, 0);
});
