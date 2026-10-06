import { assertEquals } from "@std/assert";
import contactCreate from "../../actions/contact-create.ts";
import { alegraError, assertRejects, bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("contact-create: POST /contacts nests address and sends types as an array", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "8", name: "Acrecer" } }]);
  const out = await contactCreate.execute({
    name: "Acrecer",
    identification: "963.654.988",
    email: "a@x.com",
    types: ["client", "provider"],
    address: "Main 1",
    city: "Bogota",
    creditLimit: 100,
    ignoreRepeated: true,
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v1/contacts");
  assertEquals(bodyOf(calls[0]), {
    name: "Acrecer",
    identification: "963.654.988",
    email: "a@x.com",
    creditLimit: 100,
    ignoreRepeated: true,
    type: ["client", "provider"],
    address: { address: "Main 1", city: "Bogota" },
  });
  assertEquals(out, { id: "8", name: "Acrecer" });
});

Deno.test("contact-create: only the name is sent when nothing else is given", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "8" } }]);
  await contactCreate.execute({ name: "Solo" }, ctx);
  assertEquals(bodyOf(calls[0]), { name: "Solo" });
});

Deno.test("contact-create: additionalFields merge in, and a non-object is rejected", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "8" } }]);
  await contactCreate.execute({ name: "N", additionalFields: '{"giro":"retail"}' }, ctx);
  assertEquals(bodyOf(calls[0]).giro, "retail");
  await assertRejects(
    () => contactCreate.execute({ name: "N", additionalFields: "[1]" }, ctx),
    Error,
    "JSON object",
  );
});

Deno.test("contact-create: a 400 surfaces the vendor message", async () => {
  const { ctx } = mockCtx([{ status: 400, body: alegraError(400, "ya existe") }]);
  await assertRejects(() => contactCreate.execute({ name: "N" }, ctx), Error, "ya existe");
});
