import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockSalesmateCtx } from "../_helpers.ts";
import update from "../../actions/contact-update.ts";

const B = "https://acme.salesmate.io/apis/contact/v4";
const ok = (Data: unknown) => ({ body: { Status: "success", Data } });

test("contact-update: PUTs to /contact/v4/:id without the id in the body", async () => {
  const { ctx, calls } = mockSalesmateCtx([ok({ id: 3 })]);
  await update.execute({ contactId: 3, ...{ "lastName": "Jobs", "owner": 1 } } as never, ctx);
  assertEquals(calls[0].url, `${B}/3`);
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), { "lastName": "Jobs", "owner": 1 });
});
