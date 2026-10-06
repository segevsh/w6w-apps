import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/search-prospects.ts";
import { bodyOf, exec, mockCtx } from "../_helpers.ts";

const filters = { job_title_level: ["CXO"], company_size: ["51-200"] };

Deno.test("search-prospects: posts size and filters, returns total, profiles and credits", async () => {
  const data = {
    total: 1200,
    profiles: [{ full_name: "A B", job_title: "CTO" }],
    credits: { api_credits: { total: 1, search_credits: 1 } },
  };
  const { ctx, calls } = mockCtx([{ body: { status: { code: 200 }, data } }]);
  const out = await exec(action, { filters, size: 5 }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://wiza.co/api/prospects/search");
  assertEquals(bodyOf(calls[0]), { size: 5, filters });
  assertEquals(out, { total: 1200, profiles: data.profiles, credits: data.credits });
});

Deno.test("search-prospects: size defaults to 0 (count only) and filters may be a JSON string", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { total: 3 } } }]);
  const out = await exec(action, { filters: JSON.stringify(filters) }, ctx);
  assertEquals(bodyOf(calls[0]), { size: 0, filters });
  assertEquals(out, { total: 3, profiles: [], credits: null });
});

Deno.test("search-prospects: size over 30 and non-object filters are refused locally", async () => {
  const none = mockCtx();
  await assertRejects(() => exec(action, { filters, size: 31 }, none.ctx), Error, "0 to 30");
  await assertRejects(() => exec(action, { filters: "[1]" }, none.ctx), Error, "must be an object");
  assertEquals(none.calls.length, 0);
});
