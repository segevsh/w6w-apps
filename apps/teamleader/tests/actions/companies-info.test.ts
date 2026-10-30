import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/companies-info.ts";

test("companies-info: POSTs companies.info with {id} and returns the company", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { data: { id: "1", name: "Pied Piper" } },
  }]);
  const out = await action.execute({ id: "1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/companies.info");
  assertEquals(JSON.parse(calls[0].body!), { id: "1" });
  assertEquals(out, { company: { id: "1", name: "Pied Piper" } });
});
