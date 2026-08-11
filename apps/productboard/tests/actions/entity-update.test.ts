import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/entity-update.ts";
import { bodyOf, envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("entity-update: PATCHes with the fields form", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: "e-1" }) }]);
  await action.execute({ entityId: "e-1", fields: { name: "Next" } }, ctx);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/v2/entities/e-1");
  assertEquals(bodyOf(calls[0]), { data: { fields: { name: "Next" } } });
});

Deno.test("entity-update: the patch form is sent verbatim, so addItems does not become a replace", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({}) }]);
  const patch = [{ op: "addItems", path: "tags", value: [{ name: "api" }] }];
  await action.execute({ entityId: "e-1", patch }, ctx);
  assertEquals(bodyOf(calls[0]), { data: { patch } });
});

Deno.test("entity-update: both forms may be combined", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({}) }]);
  await action.execute({
    entityId: "e-1",
    fields: { name: "n" },
    patch: [{ op: "set", path: "owner", value: { email: "a@b.c" } }],
    metadata: { source: { system: "Asana" } },
  }, ctx);
  const data = (bodyOf(calls[0]) as { data: Record<string, unknown> }).data;
  assertEquals(Object.keys(data).sort(), ["fields", "metadata", "patch"]);
});

Deno.test("entity-update: an empty update is refused rather than sent", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    () => Promise.resolve(action.execute({ entityId: "e-1" }, ctx)),
    Error,
    "an empty update does nothing",
  );
  assertEquals(calls.length, 0);
});

Deno.test("entity-update: is idempotent — set and addItems both converge", () => {
  assertEquals(action.idempotent, true);
});
