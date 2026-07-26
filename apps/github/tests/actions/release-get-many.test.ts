import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/release-get-many.ts";

Deno.test("release-get-many: GETs /releases with pagination", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: 1 }] }]);
  assertEquals(await action.execute({ owner: "acme", repository: "api", perPage: 5 }, ctx), [
    { id: 1 },
  ]);
  assertEquals(new URL(calls[0].url).searchParams.get("per_page"), "5");
});
