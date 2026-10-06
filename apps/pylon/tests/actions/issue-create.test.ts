import { assert, assertEquals } from "@std/assert";
import action from "../../actions/issue-create.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("issue-create: POSTs snake_case fields and converts custom fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: "i1" } } }]);
  const out = await action.execute!({
    title: "Login broken",
    bodyHtml: "<p>help</p>",
    accountId: "acc1",
    requesterEmail: "a@b.com",
    priority: "high",
    tags: "bug, vip",
    customFields: { plan: "pro", regions: ["us", "eu"] },
    destination: "email",
    destinationEmail: "a@b.com",
    userId: "u1",
  }, ctx);
  assertEquals(calls[0].url, "https://api.usepylon.com/issues");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    title: "Login broken",
    body_html: "<p>help</p>",
    account_id: "acc1",
    requester_email: "a@b.com",
    priority: "high",
    tags: ["bug", "vip"],
    custom_fields: [{ slug: "plan", value: "pro" }, { slug: "regions", values: ["us", "eu"] }],
    destination_metadata: { destination: "email", email: "a@b.com" },
    user_id: "u1",
  });
  assertEquals(out, { id: "i1" });
});

Deno.test("issue-create: without a destination no destination_metadata is sent (internal note)", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: {} } }]);
  await action.execute!({ title: "t", bodyHtml: "b", accountId: "a" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { title: "t", body_html: "b", account_id: "a" });
  assert(!calls[0].body!.includes("destination_metadata"));
});

Deno.test("issue-create: is not idempotent and requires title and body", () => {
  assertEquals(action.idempotent, false);
  assertEquals(action.params!.filter((p) => p.required).map((p) => p.key), ["title", "bodyHtml"]);
});
