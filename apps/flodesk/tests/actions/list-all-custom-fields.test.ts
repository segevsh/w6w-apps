import { assert, assertEquals } from "@std/assert";
import { mockCtx, outputKeys } from "../_helpers.ts";

import listAllCustomFields from "../../actions/list-all-custom-fields.ts";
import listCustomFields from "../../actions/list-custom-fields.ts";

Deno.test("list-all-custom-fields: GET /v1/custom-fields/all, a bare array", async () => {
  const fields = [{ key: "fav", label: "Favorite color" }, { key: "tier", label: "Tier" }];
  const { ctx, calls } = mockCtx([{ body: fields }]);
  const out = await listAllCustomFields.execute({}, ctx);

  assertEquals(calls[0].url, "https://api.flodesk.com/v1/custom-fields/all");
  assertEquals(out, fields);
  assertEquals(listAllCustomFields.params, [], "this endpoint takes no parameters at all");
  // No envelope on this one — it must not advertise a `meta` output.
  assert(!outputKeys(listAllCustomFields).includes("meta"));
});

Deno.test("list-all-custom-fields: is a `read`, the paginated form a `search`", () => {
  assertEquals(listAllCustomFields.type, "read");
  assertEquals(listCustomFields.type, "search");
});
