import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/contact-create.ts";

const conn = { display: { baseUrl: "https://live-mt-server.wati.io/12345" } };

test("contact-create: POSTs /contacts with `custom_params` (snake_case)", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "1", name: "John Doe" } }], conn);
  const out = await action.execute(
    {
      whatsappNumber: "1234567890",
      name: "John Doe",
      customParams: [{ name: "age", value: "30" }],
    },
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://live-mt-server.wati.io/12345/api/ext/v3/contacts");
  assertEquals(
    JSON.parse(calls[0].body!),
    {
      whatsapp_number: "1234567890",
      name: "John Doe",
      custom_params: [{ name: "age", value: "30" }],
    },
  );
  assertEquals(out, { id: "1", name: "John Doe" });
});

test("contact-create: is not idempotent", () => {
  assertEquals(action.idempotent, false);
});
