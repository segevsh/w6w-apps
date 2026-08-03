import { assert, assertEquals } from "@std/assert";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";
import action from "../../actions/document-create-from-template.ts";

const recipients = [{ email: "a@b.com", role: "Client" }];

Deno.test("document-create-from-template: POSTs /documents mapping camelCase to snake_case", async () => {
  const { ctx, calls } = mockCtx([
    { status: 201, body: { id: "d1", status: "document.uploaded" } },
  ]);
  await action.execute({
    name: "MSA",
    templateUuid: "t1",
    recipients,
    tokens: [{ name: "Client.Company", value: "Acme" }],
    fields: { CustomerName: { value: "Ada" } },
    pricingTables: [{ name: "Pricing" }],
    metadata: { crm_deal_id: "1234" },
    tags: ["renewal"],
    folderUuid: "f1",
    owner: { email: "rep@acme.com" },
  }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0]), "/public/v1/documents");
  assertEquals(bodyOf(calls[0]), {
    name: "MSA",
    template_uuid: "t1",
    recipients,
    tokens: [{ name: "Client.Company", value: "Acme" }],
    fields: { CustomerName: { value: "Ada" } },
    pricing_tables: [{ name: "Pricing" }],
    metadata: { crm_deal_id: "1234" },
    tags: ["renewal"],
    folder_uuid: "f1",
    owner: { email: "rep@acme.com" },
  });
});

Deno.test("document-create-from-template: omits every unset optional field", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }]);
  await action.execute({ name: "MSA", templateUuid: "t1", recipients }, ctx);
  assertEquals(bodyOf(calls[0]), { name: "MSA", template_uuid: "t1", recipients });
});

Deno.test("document-create-from-template: returns document.uploaded and PandaDoc's polling notice", async () => {
  const { ctx } = mockCtx([{
    status: 201,
    body: {
      id: "d1",
      status: "document.uploaded",
      info_message: "Poll Document Status until status changes to document.draft",
    },
  }]);
  const out = await action.execute({ name: "MSA", templateUuid: "t1", recipients }, ctx) as {
    status: string;
    info_message: string;
  };
  // The async model, asserted rather than described: creation does NOT yield a
  // sendable document.
  assertEquals(out.status, "document.uploaded");
  assert(out.info_message.includes("document.draft"));
});

Deno.test("document-create-from-template: logs the template it is creating from", async () => {
  const { ctx, logs } = mockCtx([{ status: 201, body: {} }]);
  await action.execute({ name: "MSA", templateUuid: "t1", recipients }, ctx);
  assertEquals(logs[0].level, "info");
  assertEquals(logs[0].data, { templateUuid: "t1" });
});

Deno.test("document-create-from-template: is a non-idempotent perform", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, false);
});

Deno.test("document-create-from-template: describes the asynchronous status model", () => {
  assert(/document.uploaded/.test(action.description ?? ""), action.description);
  assert(/document.draft/.test(action.description ?? ""), action.description);
});
