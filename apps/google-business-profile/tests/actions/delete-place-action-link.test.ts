import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/delete-place-action-link.ts";

Deno.test("delete-place-action-link: DELETEs /v1/{name}", async () => {
  const { ctx, calls } = mockCtx([{ status: 204, body: undefined }]);
  const result = await action.execute(
    { name: "locations/1/placeActionLinks/2" },
    ctx,
  );

  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/v1/locations/1/placeActionLinks/2");
  assertEquals(result, { success: true });
});
