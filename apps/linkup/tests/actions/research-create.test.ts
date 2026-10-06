import { assertEquals, assertRejects } from "@std/assert";
import researchCreate from "../../actions/research-create.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("research-create: posts mode, depth and filters", async () => {
  const task = { id: "r1", status: "pending" };
  const { ctx, calls } = mockCtx([{ body: task }]);
  const out = await researchCreate.execute({
    q: " compare X and Y ",
    outputType: "sourcedAnswer",
    mode: "investigate",
    reasoningDepth: "XL",
    toDate: "2026-06-30",
    includeDomains: "a.com\nb.com",
  }, ctx);
  assertEquals(out, { id: "r1", status: "pending", task });
  assertEquals(calls[0].url, "https://api.linkup.so/v1/research");
  assertEquals(JSON.parse(calls[0].body!), {
    q: "compare X and Y",
    outputType: "sourcedAnswer",
    mode: "investigate",
    reasoningDepth: "XL",
    toDate: "2026-06-30",
    includeDomains: ["a.com", "b.com"],
  });
  assertEquals(researchCreate.idempotent, false);
});

Deno.test("research-create: structured needs a schema, sent as a string", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "r2", status: "pending" } }]);
  await assertRejects(
    async () => await researchCreate.execute({ q: "q", outputType: "structured" }, ctx),
    Error,
    "Output schema is required",
  );
  await assertRejects(
    async () => await researchCreate.execute({ q: "q", outputType: "searchResults" }, ctx),
    Error,
    "outputType",
  );
  assertEquals(calls.length, 0);
  await researchCreate.execute({
    q: "q",
    outputType: "structured",
    structuredOutputSchema: { type: "object" },
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!).structuredOutputSchema, '{"type":"object"}');
});
