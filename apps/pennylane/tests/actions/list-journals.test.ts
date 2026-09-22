import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-journals.ts";

const PAGE = {
  items: [{ id: 1, code: "VE", label: "Sales", type: "sales" }],
  has_more: false,
  next_cursor: null,
};

Deno.test("list-journals: GETs /journals", async () => {
  const { ctx, calls } = mockCtx([{ body: PAGE }]);
  const res = await action.execute({}, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).pathname, "/api/external/v2/journals");
  assertEquals(res, PAGE);
});

Deno.test("list-journals: filters on the journal type", async () => {
  const { ctx, calls } = mockCtx([{ body: PAGE }]);
  await action.execute({ filter: [{ field: "type", operator: "eq", value: "payroll" }] }, ctx);
  assertEquals(
    new URL(calls[0].url).searchParams.get("filter"),
    '[{"field":"type","operator":"eq","value":"payroll"}]',
  );
});
