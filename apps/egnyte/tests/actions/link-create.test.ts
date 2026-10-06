import { assertEquals, assertRejects } from "@std/assert";
import { mockEgnyteCtx } from "../_helpers.ts";
import action from "../../actions/link-create.ts";

Deno.test("link-create: POSTs only the fields provided", async () => {
  const { ctx, calls } = mockEgnyteCtx([{ status: 201, body: { links: [{ id: "L" }] } }]);
  const out = await action.execute(
    { path: "/Shared/a.pdf", type: "file", accessibility: "anyone" },
    ctx,
  );
  assertEquals(calls[0].url, "https://acme.egnyte.com/pubapi/v1/links");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    path: "/Shared/a.pdf",
    type: "file",
    accessibility: "anyone",
  });
  assertEquals(out, { links: [{ id: "L" }] });
});

Deno.test("link-create: maps recipients, expiry, email and flags to Egnyte names", async () => {
  const { ctx, calls } = mockEgnyteCtx([{ body: {} }]);
  await action.execute({
    path: "/f",
    type: "folder",
    accessibility: "recipients",
    recipients: "a@x.com, b@x.com",
    sendEmail: true,
    message: "hi",
    notify: false,
    linkToCurrent: true,
    expiryClicks: 3,
    protection: "PREVIEW",
    useDefaultSettings: true,
    password: "pw",
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {
    path: "/f",
    type: "folder",
    accessibility: "recipients",
    useDefaultSettings: true,
    recipients: ["a@x.com", "b@x.com"],
    send_email: true,
    message: "hi",
    notify: false,
    link_to_current: true,
    expiry_clicks: 3,
    password: "pw",
    protection: "PREVIEW",
  });
});

Deno.test("link-create: surfaces a 400", async () => {
  const { ctx } = mockEgnyteCtx([{ status: 400, body: { errorMessage: "bad" } }]);
  await assertRejects(
    async () => await action.execute({ path: "/f", type: "file" }, ctx),
    Error,
    "Egnyte 400",
  );
});
