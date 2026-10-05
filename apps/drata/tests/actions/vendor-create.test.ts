import { assert, assertEquals, assertRejects } from "@std/assert";
import vendorCreate from "../../actions/vendor-create.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("vendor-create: POST /vendors sends only what was set, as JSON", async () => {
  const { ctx, calls } = mockCtx([{
    status: 201,
    body: { id: 5, name: "Acme", status: "ACTIVE" },
  }]);
  const out = await vendorCreate.execute(
    { name: "Acme", risk: "LOW", hasPii: false, notes: "", url: undefined },
    ctx,
  ) as { id: number };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/public/v2/vendors");
  assertEquals(calls[0].headers["content-type"], "application/json");
  // `false` survives, empty string / undefined do not.
  assertEquals(JSON.parse(calls[0].body!), { name: "Acme", risk: "LOW", hasPii: false });
  assertEquals(out.id, 5);
});

Deno.test("vendor-create: the contact email goes out as `contactEmail` (create spelling)", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: 5 } }]);
  await vendorCreate.execute({ name: "Acme", contactEmail: "sec@acme.io" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.contactEmail, "sec@acme.io");
  assertEquals("contactsEmail" in body, false);
});

Deno.test("vendor-create: is declared non-idempotent", () => {
  assertEquals(vendorCreate.idempotent, false);
});

Deno.test("vendor-create: a 400 surfaces the validation message", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: errorBody(400, ["url must be a URL address"], 2),
  }]);
  const err = await assertRejects(
    () => Promise.resolve().then(() => vendorCreate.execute({ name: "Acme", url: "nope" }, ctx)),
    Error,
  );
  assert(err.message.includes("HTTP 400"), err.message);
  assert(err.message.includes("url must be a URL address"), err.message);
});
