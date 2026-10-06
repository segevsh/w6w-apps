import { assertEquals } from "@std/assert";
import contactCreate from "../../actions/contact-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const REPLY = { data: { ok: true }, message: "done" };

Deno.test("contact-create: sends every input as body", async () => {
  const { ctx, calls } = mockCtx([{ body: REPLY }]);
  const out = await contactCreate.execute({
    "firstName": "x-firstName",
    "lastName": "x-lastName",
    "email": "x-email",
    "phoneNumber": "x-phoneNumber",
    "status": "POTENTIAL",
    "tag": "x-tag",
    "joinedTime": "x-joinedTime",
    "linkPrefix": "x-linkPrefix",
    "utm": "x-utm",
    "country": "x-country",
    "timeZone": "x-timeZone",
    "ipAddress": "x-ipAddress",
    "referrerUrl": "x-referrerUrl",
  } as never, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/contacts");
  assertEquals(JSON.parse(calls[0].body!), {
    "firstName": "x-firstName",
    "lastName": "x-lastName",
    "email": "x-email",
    "phoneNumber": "x-phoneNumber",
    "status": "POTENTIAL",
    "tag": "x-tag",
    "joinedTime": "x-joinedTime",
    "linkPrefix": "x-linkPrefix",
    "utm": "x-utm",
    "country": "x-country",
    "timeZone": "x-timeZone",
    "ipAddress": "x-ipAddress",
    "referrerUrl": "x-referrerUrl",
  });
  assertEquals(out, REPLY);
});

Deno.test("contact-create: omits every unset optional", async () => {
  const { ctx, calls } = mockCtx([{ body: REPLY }]);
  await contactCreate.execute({} as never, ctx);

  assertEquals(JSON.parse(calls[0].body!), {});
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("contact-create: declares a perform action's idempotency", () => {
  assertEquals(contactCreate.type, "perform");
  assertEquals(contactCreate.idempotent, false);
  assertEquals(contactCreate.params!.filter((p) => p.required).map((p) => p.key), []);
});
