import { assertEquals, assertRejects } from "@std/assert";
import searchStructured from "../../actions/search-structured.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("search-structured: pins structured, requires the schema", async () => {
  const s = mockCtx([{ body: { k: 1 } }]);
  const out = await searchStructured.execute({
    q: "q",
    structuredOutputSchema: { type: "object" },
  }, s.ctx);
  assertEquals(out.data, { k: 1 });
  assertEquals(JSON.parse(s.calls[0].body!).outputType, "structured");
  assertEquals(
    searchStructured.params!.find((p) => p.key === "structuredOutputSchema")!.required,
    true,
  );
  await assertRejects(
    async () => await searchStructured.execute({ q: "q" }, s.ctx),
    Error,
    "Output schema",
  );
});
