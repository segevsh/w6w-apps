import { assert, assertEquals, assertRejects } from "@std/assert";
import vendorUpdate from "../../actions/vendor-update.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("vendor-update: PUT /vendors/{id} sends only the supplied fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 5, status: "ARCHIVED" } }]);
  const out = await vendorUpdate.execute({ vendorId: 5, status: "ARCHIVED" }, ctx) as {
    status: string;
  };

  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/public/v2/vendors/5");
  assertEquals(JSON.parse(calls[0].body!), { status: "ARCHIVED" });
  assertEquals(out.status, "ARCHIVED");
});

Deno.test("vendor-update: the contact email goes out as `contactsEmail` (update spelling)", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 5 } }]);
  await vendorUpdate.execute({ vendorId: 5, contactsEmail: "sec@acme.io" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.contactsEmail, "sec@acme.io");
  assertEquals("contactEmail" in body, false);
  assertEquals("vendorId" in body, false, "the path id must not leak into the body");
});

Deno.test("vendor-update: is idempotent (a PUT of the same fields converges)", () => {
  assertEquals(vendorUpdate.idempotent, true);
});

Deno.test("vendor-update: a 404 surfaces Drata's message", async () => {
  const { ctx } = mockCtx([{ status: 404, body: errorBody(404, "Vendor not found", 3) }]);
  const err = await assertRejects(
    () => Promise.resolve().then(() => vendorUpdate.execute({ vendorId: 1 }, ctx)),
    Error,
  );
  assert(err.message.includes("Vendor not found"), err.message);
});
