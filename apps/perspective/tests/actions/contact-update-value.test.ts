import { assertEquals, assertRejects } from "@std/assert";
import contactUpdateValue from "../../actions/contact-update-value.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("contact-update-value: PUTs {fieldName, value} to /values", async () => {
  const row = {
    id: "val_1",
    fieldName: "firstName",
    value: "Jane",
    updatedAt: "2025-06-02T10:15:30.000Z",
  };
  const { ctx, calls } = mockCtx([{ body: envelope(row) }]);
  const out = await contactUpdateValue.execute(
    { funnelId: "f1", contactId: "c1", fieldName: "firstName", value: "Jane" },
    ctx,
  ) as { data: typeof row };
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/v1/funnels/f1/contacts/c1/values");
  assertEquals(JSON.parse(calls[0].body!), { fieldName: "firstName", value: "Jane" });
  assertEquals(out.data, row);
});

Deno.test("contact-update-value: value is sent as a string and skipAutomationTrigger forwarded", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({}) }]);
  await contactUpdateValue.execute({
    funnelId: "f",
    contactId: "c",
    fieldName: "score",
    value: 42 as unknown as string,
    skipAutomationTrigger: true,
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {
    fieldName: "score",
    value: "42",
    skipAutomationTrigger: true,
  });
});

Deno.test("contact-update-value: requires fieldName and value", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(() =>
    Promise.resolve(
      contactUpdateValue.execute({ funnelId: "f", contactId: "c", fieldName: "", value: "v" }, ctx),
    )
  );
  await assertRejects(() =>
    Promise.resolve(
      contactUpdateValue.execute(
        { funnelId: "f", contactId: "c", fieldName: "x", value: undefined as unknown as string },
        ctx,
      ),
    )
  );
  assertEquals(calls.length, 0);
});

Deno.test("contact-update-value: a reserved-field 400 surfaces", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { error: "reserved field", status: 400 } }]);
  await assertRejects(
    () =>
      Promise.resolve(
        contactUpdateValue.execute(
          { funnelId: "f", contactId: "c", fieldName: "ps_source", value: "x" },
          ctx,
        ),
      ),
    Error,
    "Perspective 400: reserved field",
  );
  assertEquals(contactUpdateValue.idempotent, false);
});
