import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/bulk-enrich-person.ts";
import { bodyOf, exec, mockCtx } from "../_helpers.ts";

const reply = {
  error: false,
  total_cost: 1,
  matched: [{ identifier: "1", person: {}, company: {} }],
  not_matched: ["2"],
  invalid_datapoints: ["3"],
};

Deno.test("bulk-enrich-person: posts the records plus flags and returns the three lists", async () => {
  const { ctx, calls } = mockCtx([{ body: reply }]);
  const records = [{ identifier: "1", email: "a@b.co" }, { identifier: "2", full_name: "A B" }];
  const out = await exec(action, { records, enrichMobile: true }, ctx);
  assertEquals(calls[0].url, "https://api.prospeo.io/bulk-enrich-person");
  assertEquals(bodyOf(calls[0]), { enrich_mobile: true, data: records });
  assertEquals(out.total_cost, 1);
  assertEquals(out.not_matched, ["2"]);
  assertEquals(out.invalid_datapoints, ["3"]);
  assertEquals(out.matched.length, 1);
});

Deno.test("bulk-enrich-person: accepts a JSON string and rejects bad input before calling", async () => {
  const { ctx, calls } = mockCtx([{ body: reply }]);
  await exec(action, { records: '[{"identifier":"1","linkedin_url":"u"}]' }, ctx);
  assertEquals((bodyOf(calls[0]).data as unknown[]).length, 1);
  await assertRejects(() => exec(action, { records: [{ email: "x" }] }, ctx), Error, "identifier");
  assertEquals(calls.length, 1);
});

Deno.test("bulk-enrich-person: an INSUFFICIENT_CREDITS error throws", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: { error: true, error_code: "INSUFFICIENT_CREDITS" },
  }]);
  await assertRejects(
    () => exec(action, { records: [{ identifier: "1", email: "a@b.co" }] }, ctx),
    Error,
    "INSUFFICIENT_CREDITS",
  );
});
