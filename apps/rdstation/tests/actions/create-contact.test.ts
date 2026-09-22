import { assertEquals } from "@std/assert";

import createContact from "../../actions/create-contact.ts";
import { API_ROOT, bodyOf, mockCtx } from "../_helpers.ts";

Deno.test("create-contact: POST /contacts with the documented {contact:{…}} body", async () => {
  const { ctx, calls } = mockCtx([{ body: { _id: "c1" } }]);

  await createContact.execute(
    {
      name: "Ada Lovelace",
      email: "ada@example.com",
      phone: "+5511999990000",
      phoneType: "cellphone",
      title: "CTO",
      organizationId: "org1",
      skype: "ada.l",
      linkedin: "ada",
      facebook: "ada",
    },
    ctx,
  );

  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, `${API_ROOT}/contacts`);
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(bodyOf(calls[0]), {
    contact: {
      name: "Ada Lovelace",
      emails: [{ email: "ada@example.com" }],
      phones: [{ phone: "+5511999990000", type: "cellphone" }],
      title: "CTO",
      organization_id: "org1",
      skype: "ada.l",
      linkedin: "ada",
      facebook: "ada",
    },
  });
});

Deno.test("create-contact: fields the caller left out are omitted, not sent empty", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);

  await createContact.execute({ name: "Ada" }, ctx);

  assertEquals(bodyOf(calls[0]), { contact: { name: "Ada" } });
});

Deno.test("create-contact: a JSON emails/phones array wins over the scalar shortcut", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);

  await createContact.execute(
    {
      email: "ignored@example.com",
      phone: "+5511999990000",
      emails: [{ email: "ada@example.com" }, { email: "ada@work.example.com" }],
      phones: '[{"phone":"+5511988880000","type":"home"}]',
    },
    ctx,
  );

  assertEquals(bodyOf(calls[0]), {
    contact: {
      emails: [{ email: "ada@example.com" }, { email: "ada@work.example.com" }],
      phones: [{ phone: "+5511988880000", type: "home" }],
    },
  });
});

Deno.test("create-contact: a single phone carries the type only when one was given", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }, { body: {} }]);

  await createContact.execute({ phone: "+5511999990000" }, ctx);
  await createContact.execute({ phone: "+5511999990000", phoneType: "work" }, ctx);

  assertEquals(bodyOf(calls[0]), { contact: { phones: [{ phone: "+5511999990000" }] } });
  assertEquals(bodyOf(calls[1]), {
    contact: { phones: [{ phone: "+5511999990000", type: "work" }] },
  });
});

Deno.test("create-contact: no params beyond the documented contact fields", () => {
  const keys = (createContact.params ?? []).map((p) => p.key).sort();
  assertEquals(keys, [
    "email",
    "emails",
    "facebook",
    "linkedin",
    "name",
    "organizationId",
    "phone",
    "phoneType",
    "phones",
    "skype",
    "title",
  ]);
  assertEquals(createContact.idempotent, false);
  assertEquals(createContact.type, "perform");
});
