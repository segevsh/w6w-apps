import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/table-list.ts";

const D = { display: { host: "https://nocodb.internal" } };
const tables = {
  status: 200,
  body: {
    list: [
      { id: "mtbl1", title: "Orders", table_name: "orders" },
      { id: "mtbl2", title: "Customers", table_name: "customers" },
    ],
  },
};

/** Every record action takes the id; nothing takes the title. */
Deno.test("table-list: returns a title-to-id lookup", async () => {
  const { ctx, calls } = mockCtx([tables], D);
  const result = await action.execute({ baseId: "p1" }, ctx) as Record<string, unknown>;
  assertEquals(new URL(calls[0].url).pathname, "/api/v2/meta/bases/p1/tables");
  assertEquals(result.byTitle, { Orders: "mtbl1", Customers: "mtbl2" });
  assertEquals(result.ids, ["mtbl1", "mtbl2"]);
});

Deno.test("table-list: an empty base is an empty list, not an error", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { list: [] } }], D);
  const result = await action.execute({ baseId: "p1" }, ctx) as Record<string, unknown>;
  assertEquals(result.count, 0);
  assertEquals(result.byTitle, {});
});

Deno.test("table-list: requires a base id", async () => {
  const { ctx, calls } = mockCtx([], D);
  await assertRejects(async () => await action.execute({}, ctx), Error, "`baseId` is required");
  assertEquals(calls.length, 0);
});

Deno.test("table-list: says ids survive a rename", () => {
  assert(/survive a rename/.test(action.description!), action.description);
});
