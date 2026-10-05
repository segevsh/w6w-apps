import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx, pathOf } from "../_helpers.ts";
import customObjectRecordGet from "../../actions/custom-object-record-get.ts";

Deno.test("custom-object-record-get: GETs .../records/external_id/<id>/ and returns the record bare", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { id: "r1", name: "Laptop", external_id: "asset 17" } },
  ]);
  const out = await customObjectRecordGet.execute(
    { customObjectApiName: "asset", externalId: "asset 17" },
    ctx,
  ) as Record<string, unknown>;

  assertEquals(pathOf(calls[0].url), "/custom-objects/asset/records/external_id/asset%2017/");
  assertEquals(out.id, "r1");
});

Deno.test("custom-object-record-get: requires both identifiers before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    () =>
      Promise.resolve().then(() =>
        customObjectRecordGet.execute({ customObjectApiName: "", externalId: "x" }, ctx)
      ),
    Error,
    "customObjectApiName is required",
  );
  await assertRejects(
    () =>
      Promise.resolve().then(() =>
        customObjectRecordGet.execute({ customObjectApiName: "asset", externalId: " " }, ctx)
      ),
    Error,
    "externalId is required",
  );
  assertEquals(calls.length, 0);
});
