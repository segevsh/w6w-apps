import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockNationBuilderCtx } from "../_helpers.ts";
import action from "../../actions/person-get.ts";

test("person-get: GETs /signups/{id} and flattens the resource", async () => {
  const { ctx, calls } = mockNationBuilderCtx([{
    body: {
      data: { id: "42", type: "signups", attributes: { first_name: "Kim", email: "k@e.com" } },
    },
  }]);
  const out = await action.execute({ personId: "42" }, ctx);
  assertEquals(calls[0].url, "https://acme.nationbuilder.com/api/v2/signups/42");
  assertEquals(out, { id: "42", type: "signups", first_name: "Kim", email: "k@e.com" });
});
