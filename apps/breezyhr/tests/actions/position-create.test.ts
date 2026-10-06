import { assertEquals } from "@std/assert";
import action from "../../actions/position-create.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("position-create: POSTs the nested location and salary", async () => {
  const { ctx, calls } = mockCtx([{ body: { _id: "p1" } }]);
  const out = await action.execute!({
    companyId: "c1",
    name: "Dev",
    description: "<p>x</p>",
    type: "fullTime",
    country: "US",
    state: "CA",
    isRemote: true,
    salaryFrom: 100,
    salaryCurrency: "USD",
    tags: "a, b",
  }, ctx);
  assertEquals(calls[0].url, "https://api.breezy.hr/v3/company/c1/positions");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    name: "Dev",
    description: "<p>x</p>",
    type: "fullTime",
    location: { country: "US", state: "CA", is_remote: true },
    salary: { from: 100, currency: "USD" },
    tags: ["a", "b"],
  });
  assertEquals(out, { _id: "p1" });
});

Deno.test("position-create: unset optional fields are never sent", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({
    companyId: "c1",
    name: "Dev",
    description: "d",
    type: "other",
    country: "IL",
    applicationForm: '{"resume":"required"}',
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {
    name: "Dev",
    description: "d",
    type: "other",
    location: { country: "IL" },
    application_form: { resume: "required" },
  });
  assertEquals(action.idempotent, false);
});
