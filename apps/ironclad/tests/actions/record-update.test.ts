import { assertEquals, assertRejects } from "@std/assert";
import recordUpdate from "../../actions/record-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("record-update: PATCH /records/{id} sends only the named changes", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "r1", name: "New" } }]);
  const out = await recordUpdate.execute(
    {
      recordId: "r1",
      name: "New",
      addProperties: { agreementDate: { type: "date", value: "2026-01-01" } },
      removeProperties: '["counterpartyAddress"]',
    },
    ctx,
  ) as { name: string };
  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/public/api/v1/records/r1");
  assertEquals(JSON.parse(calls[0].body!), {
    name: "New",
    addProperties: { agreementDate: { type: "date", value: "2026-01-01" } },
    removeProperties: ["counterpartyAddress"],
  });
  assertEquals(out.name, "New");
});

Deno.test("record-update: with no change named, nothing is sent", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await recordUpdate.execute({ recordId: "r1" }, ctx));
  assertEquals(calls.length, 0);
});

Deno.test("record-update: removeParent is sent only when true", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await recordUpdate.execute({ recordId: "r1", removeParent: true }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { removeParent: true });
});
