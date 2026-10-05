import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx, pathOf } from "../_helpers.ts";
import customObjectRecordUpdate from "../../actions/custom-object-record-update.ts";

Deno.test("custom-object-record-update: PATCHes .../records/<codr_id>/ and unwraps the data envelope", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: { id: "r1", name: "New" } } }]);
  const out = await customObjectRecordUpdate.execute(
    { customObjectApiName: "asset", recordId: "r1", fields: { name: "New" } },
    ctx,
  );

  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/custom-objects/asset/records/r1/");
  assertEquals(JSON.parse(calls[0].body!), { name: "New" });
  assertEquals(out, { id: "r1", name: "New" });
});

Deno.test("custom-object-record-update: requires api name, record id and a JSON object", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    () =>
      Promise.resolve().then(() =>
        customObjectRecordUpdate.execute(
          { customObjectApiName: "", recordId: "r", fields: {} },
          ctx,
        )
      ),
    Error,
    "customObjectApiName is required",
  );
  await assertRejects(
    () =>
      Promise.resolve().then(() =>
        customObjectRecordUpdate.execute(
          { customObjectApiName: "a", recordId: "", fields: {} },
          ctx,
        )
      ),
    Error,
    "recordId is required",
  );
  await assertRejects(
    () =>
      Promise.resolve().then(() =>
        customObjectRecordUpdate.execute(
          { customObjectApiName: "a", recordId: "r", fields: "" },
          ctx,
        )
      ),
    Error,
    "fields is required",
  );
  assertEquals(calls.length, 0);
  assertEquals(customObjectRecordUpdate.idempotent, true);
});
