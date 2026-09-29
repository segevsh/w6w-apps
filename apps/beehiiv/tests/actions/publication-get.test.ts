import { assertEquals } from "@std/assert";
import publicationGet from "../../actions/publication-get.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("publication-get: fetches GET /publications/:id with an optional expand", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: "pub_1", name: "Acme" } } }]);
  const out = await publicationGet.execute({ publicationId: "pub_1", expand: "stats" }, ctx) as {
    id: string;
  };

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/publications/pub_1");
  assertEquals(url.searchParams.get("expand"), "stats");
  assertEquals(out.id, "pub_1");
});

Deno.test("publication-get: encodes the publication id into the path", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: {} } }]);
  await publicationGet.execute({ publicationId: "pub 1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v2/publications/pub%201");
});

Deno.test("publication-get: is a read action", () => {
  assertEquals(publicationGet.type, "read");
});
