import { assert, assertEquals } from "@std/assert";
import { mockQbCtx } from "../_helpers.ts";
import action from "../../actions/create-table.ts";

const body = (raw: string | null) => JSON.parse(raw!);

Deno.test("create-table: POSTs with appId in the query and name in the body", async () => {
  const { ctx, calls } = mockQbCtx([{ body: { id: "bck9", name: "Orders" } }]);
  const out = await action.execute({ name: "Orders" }, ctx);

  assertEquals(calls[0].method, "POST");
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1/tables");
  assertEquals(url.searchParams.get("appId"), "bqrapp1");
  assertEquals(body(calls[0].body), { name: "Orders" });
  assertEquals(out.id, "bck9");
});

Deno.test("create-table: forwards the optional nouns and omits blanks", async () => {
  const { ctx, calls } = mockQbCtx([{ body: {} }]);
  await action.execute(
    { name: "Orders", singleRecordName: "Order", pluralRecordName: "Orders", description: "" },
    ctx,
  );
  assertEquals(body(calls[0].body).singleRecordName, "Order");
  assert(!("description" in body(calls[0].body)));
});
