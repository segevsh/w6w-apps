import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/delete-contact.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("delete-contact: DELETEs the contact and reports success", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: "" }]);
  const out = await action.execute!({ contactId: "c1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/contacts/v4/contacts/c1");
  assertEquals(out, { status: 200 });
});

Deno.test("delete-contact: copes with an empty 204 rather than failing to parse it", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  assertEquals(await action.execute!({ contactId: "c1" }, ctx), { status: 200 });
});

Deno.test("delete-contact: logs before destroying", async () => {
  const { ctx, logs } = mockCtx([{ status: 204 }]);
  await action.execute!({ contactId: "c1" }, ctx);
  assertEquals(logs[0], { level: "info", message: "deleting contact", data: { contactId: "c1" } });
});

Deno.test("delete-contact: does not report success when Wix refuses", async () => {
  const { ctx } = mockCtx([{ status: 403, body: { message: "member contact" } }]);
  const err = await assertRejects(
    async () => {
      await action.execute!({ contactId: "c1" }, ctx);
    },
    Error,
  );
  assert(err.message.includes("Wix 403"));
});

Deno.test("delete-contact: is an idempotent perform action", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, true);
});
