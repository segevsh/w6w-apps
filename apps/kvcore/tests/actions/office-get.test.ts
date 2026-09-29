import { assertEquals } from "@std/assert";
import officeGet from "../../actions/office-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("office-get: fetches /office/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 4, name: "Feel The IRE" } }]);
  const out = await officeGet.execute({ office_id: "4" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v2/public/office/4");
  assertEquals(out, { id: 4, name: "Feel The IRE" });
});
