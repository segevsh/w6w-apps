import { assertEquals } from "@std/assert";
import { mockSalesmateCtx } from "../_helpers.ts";
import update from "../../actions/company-update.ts";

const B = "https://acme.salesmate.io/apis/company/v4";
const ok = (Data: unknown) => ({ body: { Status: "success", Data } });

Deno.test("company-update: PUTs to /company/v4/:id without the id in the body", async () => {
  const { ctx, calls } = mockSalesmateCtx([ok({ id: 3 })]);
  await update.execute({ companyId: 3, ...{ "name": "Acme", "owner": 1 } } as never, ctx);
  assertEquals(calls[0].url, `${B}/3`);
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), { "name": "Acme", "owner": 1 });
});
