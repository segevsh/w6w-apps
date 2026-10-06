import { assertEquals, assertRejects } from "@std/assert";
import performance from "../../actions/performance.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("performance: posts url, config and budgets and wraps the report", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { audits: {} } } }]);
  const out = await performance.execute(
    {
      url: " https://a.com ",
      config: { extends: "lighthouse:default" },
      budgets: '[{"path":"/*"}]',
      timeout: 60000,
    },
    ctx,
  );
  assertEquals(out, { data: { data: { audits: {} } } });
  assertEquals(calls[0].url, "https://production-sfo.browserless.io/performance?timeout=60000");
  assertEquals(JSON.parse(calls[0].body!), {
    url: "https://a.com",
    config: { extends: "lighthouse:default" },
    budgets: [{ path: "/*" }],
  });
});

Deno.test("performance: validates url and budgets", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    async () => await performance.execute({ url: "" }, ctx),
    Error,
    "URL is required",
  );
  await assertRejects(
    async () => await performance.execute({ url: "https://a.com", budgets: "{}" }, ctx),
    Error,
    "JSON array",
  );
  await assertRejects(
    async () => await performance.execute({ url: "https://a.com", budgets: "nope" }, ctx),
    Error,
    "valid JSON",
  );
  assertEquals(calls.length, 0);
});
