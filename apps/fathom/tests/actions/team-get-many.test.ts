import { assertEquals } from "@std/assert";
import { mockCtx, page } from "../_helpers.ts";
import action from "../../actions/team-get-many.ts";

Deno.test("team-get-many: GETs /teams and unwraps the envelope", async () => {
  const { ctx, calls } = mockCtx([
    { body: page([{ name: "Sales", created_at: "2023-11-10T12:00:00Z" }], "cur2", 10) },
  ]);
  const result = await action.execute({ cursor: "cur1" }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/external/v1/teams");
  assertEquals(url.searchParams.get("cursor"), "cur1");
  assertEquals(result, {
    items: [{ name: "Sales", created_at: "2023-11-10T12:00:00Z" }],
    nextCursor: "cur2",
    limit: 10,
  });
});

Deno.test("team-get-many: omits an unset cursor", async () => {
  const { ctx, calls } = mockCtx([{ body: page([]) }]);
  await action.execute({}, ctx);
  assertEquals(new URL(calls[0].url).search, "");
});
