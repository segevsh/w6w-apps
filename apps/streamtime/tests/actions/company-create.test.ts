import { assertEquals } from "@std/assert";
import companyCreate from "../../actions/company-create.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("company-create: POSTs /v2/companies with only the writable fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 2001, name: "Acme Corporation" } }]);
  const result = await companyCreate.execute({
    name: "Acme Corporation",
    phone1: "+64 9 123 4567",
  }, ctx) as Record<string, unknown>;

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/companies");
  assertEquals(bodyOf(calls[0]), { name: "Acme Corporation", phone1: "+64 9 123 4567" });
  assertEquals(result.id, 2001);
});

Deno.test("company-create: a status lookup is forwarded as the object Streamtime models", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1 } }]);
  await companyCreate.execute({ name: "Acme", companyStatus: '{"id":2,"name":"Prospect"}' }, ctx);
  assertEquals(bodyOf(calls[0]).companyStatus, { id: 2, name: "Prospect" });
});

Deno.test("company-create: unset fields are omitted rather than sent as null", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1 } }]);
  await companyCreate.execute({ name: "Acme" }, ctx);
  assertEquals(Object.keys(bodyOf(calls[0])), ["name"]);
});

Deno.test("company-create: a status string that is not JSON fails before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  let message = "";
  try {
    await companyCreate.execute({ name: "Acme", companyStatus: "Prospect" }, ctx);
  } catch (err) {
    message = (err as Error).message;
  }
  assertEquals(message, "companyStatus is not valid JSON");
  assertEquals(calls.length, 0);
});
