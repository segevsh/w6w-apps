import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/field-list.ts";

Deno.test("field-list: reshapes the plain map", async () => {
  const { ctx, calls } = mockCtx([{
    body: { fieldFirstName: "First name", field12345: "Custom" },
  }]);
  const out = await action.execute({}, ctx);
  assertEquals(calls[0].url, "https://api.klicktipp.com/field");
  assertEquals(out, {
    fields: [{ key: "fieldFirstName", name: "First name" }, { key: "field12345", name: "Custom" }],
  });
});

Deno.test("field-list: detail mode carries the type", async () => {
  const { ctx, calls } = mockCtx([{ body: { field1: { name: "Plan", type: "Line" } } }]);
  const out = await action.execute({ detail: true }, ctx);
  assertEquals(calls[0].url, "https://api.klicktipp.com/field?detail=true");
  assertEquals(out, { fields: [{ key: "field1", name: "Plan", type: "Line" }] });
});
