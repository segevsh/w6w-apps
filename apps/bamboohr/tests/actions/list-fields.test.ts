import { assert, assertEquals } from "@std/assert";
import listFields from "../../actions/list-fields.ts";
import { description, mockCtx } from "../_helpers.ts";

Deno.test("list-fields: searches /meta/fields with no params", async () => {
  assertEquals(listFields.type, "search");
  assertEquals(listFields.params, []);

  const { ctx, calls } = mockCtx([{ body: [] }]);
  await listFields.execute({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v1/meta/fields");
  assertEquals(url.search, "");
});

Deno.test("list-fields: describes the three reference forms it unlocks", () => {
  // id / name / alias are exactly the numeric, standard and custom-alias forms
  // the employee reads accept in `fields`.
  const d = description(listFields);
  assert(/id/.test(d) && /name/.test(d) && /alias/.test(d));
});
