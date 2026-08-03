import { assertEquals } from "@std/assert";
import { mockCtx, page } from "../_helpers.ts";
import action from "../../actions/meeting-type-get-many.ts";

Deno.test("meeting-type-get-many: GETs /meeting_types with the cursor", async () => {
  const { ctx, calls } = mockCtx([
    { body: page([{ name: "Quarterly Business Review", status: "active" }], null, 10) },
  ]);
  const result = await action.execute({ cursor: "cur1" }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/external/v1/meeting_types");
  assertEquals(url.searchParams.get("cursor"), "cur1");
  assertEquals(result.items, [{ name: "Quarterly Business Review", status: "active" }]);
  assertEquals(result.nextCursor, null);
});

Deno.test("meeting-type-get-many: omits an unset cursor", async () => {
  const { ctx, calls } = mockCtx([{ body: page([]) }]);
  await action.execute({}, ctx);
  assertEquals(new URL(calls[0].url).search, "");
});
