import { assertEquals } from "@std/assert";
import { mockSalesmateCtx } from "../_helpers.ts";
import create from "../../actions/contact-create.ts";

const B = "https://acme.salesmate.io/apis/contact/v4";
const ok = (Data: unknown) => ({ body: { Status: "success", Data } });

Deno.test("contact-create: POSTs the fields and custom fields at the top level", async () => {
  const { ctx, calls } = mockSalesmateCtx([ok({ id: 9 })]);
  const out = await create.execute(
    {
      ...{ "lastName": "Jobs", "owner": 1 },
      firstName: "Ben",
      customFields: '{"textCustomField1":"x"}',
    } as never,
    ctx,
  );
  assertEquals(out, { id: 9 });
  assertEquals(calls[0].url, B);
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    textCustomField1: "x",
    ...{ "lastName": "Jobs", "owner": 1 },
    firstName: "Ben",
  });
});

Deno.test("contact-create: drops unset optional fields rather than sending nulls", async () => {
  const { ctx, calls } = mockSalesmateCtx([ok({})]);
  await create.execute({ ...{ "lastName": "Jobs", "owner": 1 }, tags: "" } as never, ctx);
  assertEquals(JSON.parse(calls[0].body!), { "lastName": "Jobs", "owner": 1 });
});

Deno.test("contact-create: declares the documented required params", () => {
  const required = (create.params ?? []).filter((p) => p.required).map((p) => p.key).sort();
  assertEquals(required, ["lastName", "owner"]);
});
