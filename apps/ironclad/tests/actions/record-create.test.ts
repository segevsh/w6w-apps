import { assertEquals, assertRejects } from "@std/assert";
import recordCreate from "../../actions/record-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("record-create: POST /records with typed properties", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "r2", name: "NDA" } }]);
  const properties = { counterpartyName: { type: "string", value: "Acme" } };
  const out = await recordCreate.execute(
    { type: "contract", name: "NDA", properties, links: [{ recordId: "r1" }] },
    ctx,
  ) as { id: string };
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/public/api/v1/records");
  assertEquals(JSON.parse(calls[0].body!), {
    type: "contract",
    name: "NDA",
    properties,
    links: [{ recordId: "r1" }],
  });
  assertEquals(out.id, "r2");
});

Deno.test("record-create: properties and parent may be JSON strings", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await recordCreate.execute(
    { type: "contract", name: "A", properties: "{}", parent: '{"recordId":"r0"}' },
    ctx,
  );
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.properties, {});
  assertEquals(sent.parent, { recordId: "r0" });
});

Deno.test("record-create: missing properties fails before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () =>
    await recordCreate.execute({ type: "contract", name: "A", properties: "" }, ctx)
  );
  assertEquals(calls.length, 0);
});
