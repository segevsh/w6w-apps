import { assert, assertEquals } from "@std/assert";
import { mockQbCtx } from "../_helpers.ts";
import action from "../../actions/update-table.ts";

const body = (raw: string | null) => JSON.parse(raw!);

Deno.test("update-table: uses POST, which is what Quickbase v1 uses for updates", async () => {
  const { ctx, calls } = mockQbCtx([{ body: { id: "bck1" } }]);
  await action.execute({ tableId: "bck1", name: "Renamed" }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/v1/tables/bck1");
  assertEquals(new URL(calls[0].url).searchParams.get("appId"), "bqrapp1");
});

Deno.test("update-table: a partial update sends only what was set", async () => {
  const { ctx, calls } = mockQbCtx([{ body: {} }]);
  await action.execute({ tableId: "bck1", name: "Renamed" }, ctx);

  assertEquals(body(calls[0].body), { name: "Renamed" });
  assert(!("description" in body(calls[0].body)));
  assert(!("pluralRecordName" in body(calls[0].body)));
});
