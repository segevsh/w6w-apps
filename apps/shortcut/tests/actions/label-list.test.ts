import { assertEquals } from "@std/assert";
import labelList from "../../actions/label-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("label-list: calls GET /labels, forwarding slim", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await labelList.execute({ slim: true }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/v3/labels");
  assertEquals(queryOf(calls[0].url), { slim: "true" });
});
