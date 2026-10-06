import { assertEquals } from "@std/assert";
import researchStart from "../../actions/research-start.ts";
import { mockCtx, pathOf, rejection } from "../_helpers.ts";

Deno.test("research-start: 201 pending body is returned; schema string is parsed", async () => {
  const queued = { request_id: "r1", status: "pending", model: "mini", created_at: "t" };
  const { ctx, calls } = mockCtx([{ status: 201, body: queued }]);
  const out = await researchStart.execute({
    input: "topic",
    model: "mini",
    outputSchema: '{"properties":{"a":{"type":"string","description":"d"}}}',
    excludeDomains: "reddit.com",
  }, ctx);
  assertEquals(out, queued);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/research");
  assertEquals(JSON.parse(calls[0].body!), {
    input: "topic",
    model: "mini",
    output_schema: { properties: { a: { type: "string", description: "d" } } },
    exclude_domains: ["reddit.com"],
  });
});

Deno.test("research-start: not idempotent, invalid schema JSON fails before a request", async () => {
  assertEquals(researchStart.idempotent, false);
  const { ctx, calls } = mockCtx([]);
  const err = await rejection(() =>
    researchStart.execute({ input: "t", outputSchema: "{nope" }, ctx)
  );
  assertEquals(err.message, "outputSchema is not valid JSON");
  assertEquals(calls.length, 0);
});

Deno.test("research-start: stream is not exposed", () => {
  assertEquals(researchStart.params!.some((p) => p.key === "stream"), false);
});
