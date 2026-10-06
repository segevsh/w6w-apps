import { assertEquals } from "@std/assert";
import groupAddContacts from "../../actions/group-add-contacts.ts";
import { API_ROOT, mockCtx, queryOf } from "../_helpers.ts";

Deno.test("group-add-contacts: calls POST /contact-groups/3/contacts and returns the documented shape", async () => {
  const { ctx, calls } = mockCtx([{ body: ["2125551234", "2125559999"] }]);
  const result = await groupAddContacts.execute(
    { "id": "3", "phoneNumbers": ["2125551234", "2125559999"] } as never,
    ctx,
  );

  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url.split("?")[0], `${API_ROOT}/contact-groups/3/contacts`);
  assertEquals(queryOf(calls[0].url), { "phoneNumbers": "2125559999" });
  assertEquals(calls[0].body, null);
  assertEquals(result, { "result": ["2125551234", "2125559999"] });
});

Deno.test("group-add-contacts: carries no credential — auth is the sign hook's job", async () => {
  const { ctx, calls } = mockCtx([{ body: ["2125551234", "2125559999"] }]);
  await groupAddContacts.execute(
    { "id": "3", "phoneNumbers": ["2125551234", "2125559999"] } as never,
    ctx,
  );
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("group-add-contacts: sends every number as its own phoneNumbers pair, with no body", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await groupAddContacts.execute({ id: "3", phoneNumbers: ["2125551234", "2125559999"] }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.getAll("phoneNumbers"), [
    "2125551234",
    "2125559999",
  ]);
  assertEquals(calls[0].body, null);
});
