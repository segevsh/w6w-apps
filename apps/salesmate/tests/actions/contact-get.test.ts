import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockSalesmateCtx } from "../_helpers.ts";
import get from "../../actions/contact-get.ts";

const B = "https://acme.salesmate.io/apis/contact/v4";
const ok = (Data: unknown) => ({ body: { Status: "success", Data } });

test("contact-get: GETs /contact/v4/:id and unwraps Data", async () => {
  const { ctx, calls } = mockSalesmateCtx([ok({ id: 3 })]);
  assertEquals(await get.execute({ contactId: 3 }, ctx), { id: 3 });
  assertEquals(calls[0].url, `${B}/3`);
  assertEquals(calls[0].method, "GET");
});

test("contact-get: an ObjectNotFound failure body rejects", async () => {
  const { ctx } = mockSalesmateCtx([{
    status: 404,
    body: {
      Status: "failure",
      Error: { Code: "4005", Name: "ObjectNotFound", Message: "Object not found" },
    },
  }]);
  await assertRejects(
    async () => await get.execute({ contactId: 3 }, ctx),
    Error,
    "Object not found",
  );
});
