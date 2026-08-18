import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/audience-list.ts";

/** /audiences answers { object, data } with no has_more, so there is no paging. */
Deno.test("audience-list: returns the response as-is and makes exactly one call", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 200, body: { object: "list", data: [{ id: "a_1" }] } }],
    {
      display: {},
    },
  );
  const result = await action.execute!({}, ctx);
  assertEquals(calls.length, 1);
  assertEquals(new URL(calls[0].url).searchParams.get("limit"), null);
  assertEquals(result, { object: "list", data: [{ id: "a_1" }] });
});
