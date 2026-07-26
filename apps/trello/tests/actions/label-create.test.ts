import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/label-create.ts";

Deno.test("label-create: POSTs /labels with board, name and colour", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "lb1" } }]);
  await action.execute({ idBoard: "b1", name: "Bug", color: "red" }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(new URL(calls[0].url).pathname, "/1/labels");
  assertEquals(q.get("idBoard"), "b1");
  assertEquals(q.get("color"), "red");
});

Deno.test("label-create: offers Trello's ten label colours", () => {
  const opts = action.params?.find((p) => p.key === "color")?.options;
  assert(Array.isArray(opts));
  assertEquals(opts.length, 10);
});
