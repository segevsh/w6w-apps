import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/candidate-get.ts";

const ok = (results: unknown) => ({ status: 200, body: { success: true, results } });

Deno.test("candidate-get: fetches by Ashby id", async () => {
  const { ctx, calls } = mockCtx([ok({ id: "c1", name: "Ada" })]);
  const result = await action.execute!({ candidateId: "c1" }, ctx) as { id: string };
  assertEquals(calls[0].url, "https://api.ashbyhq.com/candidate.info");
  assertEquals(JSON.parse(calls[0].body!), { id: "c1" });
  assertEquals(result.id, "c1");
});

/** The reverse lookup that removes a mapping table nobody maintains. */
Deno.test("candidate-get: fetches by an id your own system assigned", async () => {
  const { ctx, calls } = mockCtx([ok({ id: "c1" })]);
  await action.execute!({ externalMappingId: "crm-4242" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { externalMappingId: "crm-4242" });
});

Deno.test("candidate-get: needs one of the two ids", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(async () => await action.execute!({}, ctx), Error, "candidateId");
  assertEquals(calls.length, 0);
});

Deno.test("candidate-get: explains what an external mapping id is for", () => {
  const p = (action.params as Array<{ key: string; hint?: string }>)
    .find((p) => p.key === "externalMappingId")!;
  assert(/outside Ashby/.test(p.hint!), p.hint);
});
