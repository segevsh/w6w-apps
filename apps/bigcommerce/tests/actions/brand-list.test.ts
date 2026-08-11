import { assertEquals } from "@std/assert";
import brandList from "../../actions/brand-list.ts";
import { mockCtx, pathOf, queryOf, v3Page } from "../_helpers.ts";

Deno.test("brand-list: uses the v3 path, not the deprecated /v2/brands", async () => {
  const { ctx, calls } = mockCtx([{ body: v3Page([{ id: 1, name: "Acme" }]) }]);
  const out = await brandList.execute({}, ctx);

  assertEquals(pathOf(calls[0].url), "/stores/abc123/v3/catalog/brands");
  assertEquals(out.data, [{ id: 1, name: "Acme" }]);
});

Deno.test("brand-list: `name:like` is the partial-match filter", async () => {
  const { ctx, calls } = mockCtx([{ body: v3Page([]) }]);
  await brandList.execute({ nameLike: "Acm", limit: 10 }, ctx);
  assertEquals(queryOf(calls[0].url), { "name:like": "Acm", limit: "10" });
});

Deno.test("brand-list: sort is only sent with the one value the vendor's enum has", async () => {
  const { ctx, calls } = mockCtx([{ body: v3Page([]) }]);
  await brandList.execute({ direction: "desc" }, ctx);
  assertEquals(queryOf(calls[0].url), { sort: "name", direction: "desc" });

  const bare = mockCtx([{ body: v3Page([]) }]);
  await brandList.execute({ name: "Acme" }, bare.ctx);
  assertEquals(queryOf(bare.calls[0].url), { name: "Acme" });
});
