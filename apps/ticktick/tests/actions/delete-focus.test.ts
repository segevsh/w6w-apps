import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/delete-focus.ts";

Deno.test("delete-focus: DELETEs with the type query parameter and decodes a body", async () => {
  // Unlike the other deletes in this API, this one returns an OpenFocus.
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "focus-1", type: 0 } }]);
  const out = await action.execute!({ focusId: "focus-1", type: 0 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(url.pathname, "/open/v1/focus/focus-1");
  assertEquals(url.searchParams.get("type"), "0");
  assertEquals(out, { id: "focus-1", type: 0 });
});

Deno.test("delete-focus: says the API can never create or update a focus record", () => {
  assert(`${action.description}`.toLowerCase().includes("never create or update"));
  assertEquals(action.idempotent, true);
});
