import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/folder-create.ts";

const conn = { display: {} };

Deno.test("folder-create: POSTs the name and type", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "f1" } }], conn);
  await action.execute!({ name: "Contracts", type: "DOCUMENT" }, ctx);
  assertEquals(calls[0].url, "https://app.documenso.com/api/v2/folder/create");
  assertEquals(JSON.parse(calls[0].body!), { name: "Contracts", type: "DOCUMENT" });
});

Deno.test("folder-create: the type defaults rather than being sent empty", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], conn);
  await action.execute!({ name: "Contracts" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).type, "DOCUMENT");
});

/** The type is fixed at creation. */
Deno.test("folder-create: a name is required, and the type hint says it is permanent", async () => {
  const { ctx, calls } = mockCtx([], conn);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`name` is required");
  assertEquals(calls.length, 0);
  const param = (action.params as Array<{ key: string; hint?: string }>)
    .find((p) => p.key === "type")!;
  assert(param.hint!.includes("Fixed at creation"), param.hint);
});
