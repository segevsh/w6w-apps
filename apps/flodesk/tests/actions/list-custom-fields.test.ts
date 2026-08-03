import { assert, assertEquals } from "@std/assert";
import { mockCtx, outputKeys } from "../_helpers.ts";

import listCustomFields from "../../actions/list-custom-fields.ts";

Deno.test("list-custom-fields: GET /v1/custom-fields, paginated", async () => {
  const { ctx, calls } = mockCtx([{
    body: { meta: { page: 1, total_items: 2 }, data: [{ key: "fav", label: "Favorite" }] },
  }]);
  await listCustomFields.execute({ page: 1, perPage: 20 }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1/custom-fields");
  assertEquals(url.searchParams.get("per_page"), "20");
  assert(outputKeys(listCustomFields).includes("meta"));
});
