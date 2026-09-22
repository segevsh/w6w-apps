import { assertEquals } from "@std/assert";
import getCategories from "../../actions/get-categories.ts";
import { envelope, mockCtx, PAGINATION_FIXTURE, pathOf, queryOf } from "../_helpers.ts";

const CATEGORY_FIXTURE = {
  name: "Animals",
  name_encoded: "animals",
  gif: { images: { original: { url: "https://media.giphy.com/media/cat/giphy.gif" } } },
};

Deno.test("get-categories: calls GET /v1/gifs/categories and passes the list through", async () => {
  const { ctx, calls } = mockCtx([
    { body: envelope([CATEGORY_FIXTURE], { pagination: PAGINATION_FIXTURE }) },
  ]);
  const out = await getCategories.execute({}, ctx) as {
    data: Array<{ name: string; name_encoded: string }>;
    pagination: unknown;
  };

  assertEquals(pathOf(calls[0].url), "/v1/gifs/categories");
  // GIPHY documents no parameters on this endpoint, so none are sent.
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(out.data[0].name, "Animals");
  assertEquals(out.data[0].name_encoded, "animals");
  assertEquals(out.pagination, PAGINATION_FIXTURE);
});

Deno.test("get-categories: declares no params at all", () => {
  assertEquals(getCategories.params, undefined);
  assertEquals(getCategories.type, "read");
});
