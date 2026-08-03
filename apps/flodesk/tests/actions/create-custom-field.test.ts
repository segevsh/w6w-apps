import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";

import createCustomField from "../../actions/create-custom-field.ts";

Deno.test("create-custom-field: POSTs only `label` — the sole documented property", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { key: "favorite_color" } }]);
  await createCustomField.execute({ label: "Favorite color" }, ctx);

  assertEquals(calls[0].url, "https://api.flodesk.com/v1/custom-fields");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { label: "Favorite color" });
  assertEquals(createCustomField.params!.length, 1);
});

Deno.test("create-custom-field: is NOT idempotent, and there is no update or delete", () => {
  assertEquals(createCustomField.idempotent, false);
  assert(
    /no way to update or delete/i.test(createCustomField.description!),
    "the missing lifecycle must be stated to the user, not just in a comment",
  );
});
