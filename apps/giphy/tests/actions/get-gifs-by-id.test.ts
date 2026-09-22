import { assertEquals } from "@std/assert";
import getGifsById from "../../actions/get-gifs-by-id.ts";
import { envelope, gif, mockCtx, PAGINATION_FIXTURE, pathOf, queryOf } from "../_helpers.ts";

Deno.test("get-gifs-by-id: calls GET /v1/gifs with one comma-separated ids value", async () => {
  const { ctx, calls } = mockCtx([
    { body: envelope([gif("a"), gif("b")], { pagination: PAGINATION_FIXTURE }) },
  ]);
  const out = await getGifsById.execute({ ids: "a,b", rating: "g" }, ctx) as {
    data: Array<{ id: string }>;
    pagination: unknown;
  };

  assertEquals(pathOf(calls[0].url), "/v1/gifs");
  // ONE parameter value, not a repeated key.
  assertEquals(queryOf(calls[0].url), { ids: "a,b", rating: "g" });
  assertEquals(out.data.map((d) => d.id), ["a", "b"]);
  assertEquals(out.pagination, PAGINATION_FIXTURE);
});

Deno.test("get-gifs-by-id: the ids string is sent exactly as typed", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope([]) }]);
  // No re-ordering, no de-duplication, no splitting into repeated keys.
  await getGifsById.execute({ ids: "z,  y ,x" }, ctx);
  assertEquals(queryOf(calls[0].url), { ids: "z,  y ,x" });
  assertEquals(new URL(calls[0].url).searchParams.getAll("ids").length, 1);
});

Deno.test("get-gifs-by-id: ids is required", () => {
  assertEquals(getGifsById.params?.find((p) => p.key === "ids")?.required, true);
});
