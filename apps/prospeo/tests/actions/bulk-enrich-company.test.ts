import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/bulk-enrich-company.ts";
import { bodyOf, exec, mockCtx } from "../_helpers.ts";

Deno.test("bulk-enrich-company: posts records to /bulk-enrich-company", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      error: false,
      total_cost: 1,
      matched: [{ identifier: "1", company: { name: "I" } }],
      not_matched: [],
      invalid_datapoints: ["4"],
    },
  }]);
  const records = [{ identifier: "1", company_website: "intercom.com" }];
  const out = await exec(action, { records }, ctx);
  assertEquals(calls[0].url, "https://api.prospeo.io/bulk-enrich-company");
  assertEquals(bodyOf(calls[0]), { data: records });
  assertEquals(out.total_cost, 1);
  assertEquals(out.invalid_datapoints, ["4"]);
  assertEquals(out.matched[0].company.name, "I");
});

Deno.test("bulk-enrich-company: more than 50 records is refused locally", async () => {
  const { ctx, calls } = mockCtx([]);
  const records = Array.from({ length: 51 }, (_, i) => ({ identifier: String(i) }));
  await assertRejects(() => exec(action, { records }, ctx), Error, "limit is 50");
  assertEquals(calls.length, 0);
});
