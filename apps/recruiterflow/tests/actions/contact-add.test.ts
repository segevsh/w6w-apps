import { assertEquals } from "@std/assert";
import contactAdd from "../../actions/contact-add.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("contact-add: POST /contact/add with the mapped wire fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { RESULT: "success", data: { id: 1 } } }]);
  const out = await contactAdd.execute(
    { "firstName": "Bo", "lastName": "Ng", "clientCompany": "Acme" } as never,
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/external/contact/add");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(JSON.parse(calls[0].body ?? "null"), {
    "first_name": "Bo",
    "last_name": "Ng",
    "client_company": "Acme",
  });
  assertEquals((out.data as { id: number }).id, 1);
});

Deno.test("contact-add: a vendor error is thrown with its message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { message: "Invalid API key" } }]);
  let msg = "";
  try {
    await contactAdd.execute(
      { "firstName": "Bo", "lastName": "Ng", "clientCompany": "Acme" } as never,
      ctx,
    );
  } catch (e) {
    msg = (e as Error).message;
  }
  assertEquals(msg.includes("HTTP 401") && msg.includes("Invalid API key"), true);
});
