import { assertEquals } from "@std/assert";
import action from "../../actions/position-update.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("position-update: PUTs only the provided fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { _id: "p1", name: "New" } }]);
  const out = await action.execute!({ companyId: "c1", positionId: "p1", name: "New" }, ctx);
  assertEquals(calls[0].url, "https://api.breezy.hr/v3/company/c1/position/p1");
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), { name: "New" });
  assertEquals(out, { _id: "p1", name: "New" });
});

Deno.test("position-update: salary is assembled and an empty tag list clears tags", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({
    companyId: "c1",
    positionId: "p1",
    salaryFrom: 1,
    salaryTo: 2,
    salaryPeriod: "Yearly",
    tags: [],
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {
    salary: { from: 1, to: 2, period: "Yearly" },
    tags: [],
  });
});
