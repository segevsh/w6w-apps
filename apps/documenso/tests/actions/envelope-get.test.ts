import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/envelope-get.ts";

const conn = { display: {} };

Deno.test("envelope-get: reads one envelope", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "e1", status: "PENDING" } }], conn);
  const result = await action.execute!({ envelopeId: "e1" }, ctx) as Record<string, unknown>;
  assertEquals(calls[0].url, "https://app.documenso.com/api/v2/envelope/e1");
  assertEquals(result.status, "PENDING");
});

/** COMPLETED only when everyone has signed — not one person's answer. */
Deno.test("envelope-get: the output says whose status this is", () => {
  const outputs = action.output as Array<{ key: string; label: string }>;
  assert(outputs.find((o) => o.key === "status")!.label.includes("EVERY recipient"));
});

Deno.test("envelope-get: a blank id fails before any request", async () => {
  const { ctx, calls } = mockCtx([], conn);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`envelopeId`");
  assertEquals(calls.length, 0);
});
