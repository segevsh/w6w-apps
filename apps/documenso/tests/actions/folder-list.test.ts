import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/folder-list.ts";

const conn = { display: {} };

Deno.test("folder-list: reads the folders", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [{ id: "f1" }] } }], conn);
  assertEquals(await action.execute!({}, ctx), [{ id: "f1" }]);
  assertEquals(new URL(calls[0].url).pathname, "/api/v2/folder");
});

/** A folder holds documents or templates, not both. */
Deno.test("folder-list: the type filter reaches the wire, and says why it exists", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [] } }], conn);
  await action.execute!({ type: "TEMPLATE", parentId: "f0" }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("type"), "TEMPLATE");
  assertEquals(q.get("parentId"), "f0");
  const param = (action.params as Array<{ key: string; hint?: string }>)
    .find((p) => p.key === "type")!;
  assert(param.hint!.includes("not both"), param.hint);
});
