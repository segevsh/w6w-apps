import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";

import createSegment from "../../actions/create-segment.ts";

Deno.test("create-segment: POSTs name, and color only when given", async () => {
  const a = mockCtx([{ status: 201, body: { id: "1" } }]);
  await createSegment.execute({ name: "VIP" }, a.ctx);
  assertEquals(JSON.parse(a.calls[0].body!), { name: "VIP" });
  assertEquals(a.calls[0].method, "POST");

  const b = mockCtx([{ status: 201, body: { id: "2" } }]);
  await createSegment.execute({ name: "VIP", color: "#B7D4C7" }, b.ctx);
  assertEquals(JSON.parse(b.calls[0].body!), { name: "VIP", color: "#B7D4C7" });
});

Deno.test("create-segment: is NOT idempotent — Flodesk allows duplicate names", () => {
  assertEquals(createSegment.idempotent, false);
});
