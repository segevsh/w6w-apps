import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-update.ts";

Deno.test("list-update: PUTs only what changed", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ id: "l1", name: "Done", closed: true }, ctx);
  assertEquals(calls[0].method, "PUT");
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("name"), "Done");
  assertEquals(q.get("closed"), "true");
  assertEquals([...q.keys()].sort(), ["closed", "name"]);
});
