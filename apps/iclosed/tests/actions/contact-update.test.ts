import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import contactUpdate from "../../actions/contact-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const REPLY = { data: { ok: true }, message: "done" };

test("contact-update: sends every input as body", async () => {
  const { ctx, calls } = mockCtx([{ body: REPLY }]);
  const out = await contactUpdate.execute({
    "id": 7,
    "firstName": "x-firstName",
    "lastName": "x-lastName",
    "email": "x-email",
    "secondary_email": "x-secondary_email",
    "phoneNumber": "x-phoneNumber",
    "secondary_phoneNumber": "x-secondary_phoneNumber",
    "status": "POTENTIAL",
    "referrerUrl": "x-referrerUrl",
  } as never, ctx);

  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/v1/contacts");
  assertEquals(JSON.parse(calls[0].body!), {
    "id": 7,
    "firstName": "x-firstName",
    "lastName": "x-lastName",
    "email": "x-email",
    "secondary_email": "x-secondary_email",
    "phoneNumber": "x-phoneNumber",
    "secondary_phoneNumber": "x-secondary_phoneNumber",
    "status": "POTENTIAL",
    "referrerUrl": "x-referrerUrl",
  });
  assertEquals(out, REPLY);
});

test("contact-update: omits every unset optional", async () => {
  const { ctx, calls } = mockCtx([{ body: REPLY }]);
  await contactUpdate.execute({ "id": 7 } as never, ctx);

  assertEquals(JSON.parse(calls[0].body!), { "id": 7 });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].headers["authorization"], undefined);
});

test("contact-update: declares a perform action's idempotency", () => {
  assertEquals(contactUpdate.type, "perform");
  assertEquals(contactUpdate.idempotent, true);
  assertEquals(contactUpdate.params!.filter((p) => p.required).map((p) => p.key), ["id"]);
});
