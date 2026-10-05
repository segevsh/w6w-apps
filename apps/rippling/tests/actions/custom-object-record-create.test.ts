import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx, pathOf } from "../_helpers.ts";
import customObjectRecordCreate from "../../actions/custom-object-record-create.ts";

Deno.test("custom-object-record-create: POSTs the fields as the body and unwraps the data envelope", async () => {
  const { ctx, calls } = mockCtx([
    { status: 201, body: { data: { id: "r1", name: "Laptop", external_id: "a-17" } } },
  ]);
  const out = await customObjectRecordCreate.execute(
    { customObjectApiName: "asset", fields: { name: "Laptop", external_id: "a-17" } },
    ctx,
  );

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/custom-objects/asset/records/");
  assertEquals(JSON.parse(calls[0].body!), { name: "Laptop", external_id: "a-17" });
  assertEquals(out, { id: "r1", name: "Laptop", external_id: "a-17" });
});

Deno.test("custom-object-record-create: accepts fields as a JSON string, rejects non-objects, is not idempotent", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { data: { id: "r2" } } }]);
  await customObjectRecordCreate.execute(
    { customObjectApiName: "asset", fields: '{"name":"Phone"}' },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!), { name: "Phone" });

  await assertRejects(
    () =>
      Promise.resolve().then(() =>
        customObjectRecordCreate.execute({ customObjectApiName: "asset", fields: "{nope" }, ctx)
      ),
    Error,
    "fields is not valid JSON",
  );
  await assertRejects(
    () =>
      Promise.resolve().then(() =>
        customObjectRecordCreate.execute({ customObjectApiName: "asset", fields: [1] }, ctx)
      ),
    Error,
    "fields must be a JSON object",
  );
  assertEquals(calls.length, 1);
  assertEquals(customObjectRecordCreate.idempotent, false);
});
