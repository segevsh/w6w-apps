import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/document-create.ts";

Deno.test("document-create: POSTs files and recipients (json text or objects) to /documents", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "d1", status: "Sent" } }]);
  const out = await action.execute!({
    files: [{ name: "a.pdf", file_url: "https://x.test/a.pdf" }],
    recipients: JSON.stringify([{ id: "1", name: "A", email: "a@b.test" }]),
    draft: false,
    expires_in: "30",
    subject: "",
    metadata: '{"order":"1"}',
  }, ctx);
  assertEquals(out, { id: "d1", status: "Sent" });
  assertEquals(calls[0].url, "https://www.signwell.com/api/v1/documents");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    files: [{ name: "a.pdf", file_url: "https://x.test/a.pdf" }],
    recipients: [{ id: "1", name: "A", email: "a@b.test" }],
    draft: false,
    expires_in: 30,
    metadata: { order: "1" },
  });
  assertEquals(action.idempotent, false);
});

Deno.test("document-create: files and recipients are required before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await action.execute!({ recipients: [] }, ctx), Error, "`files`");
  await assertRejects(async () => await action.execute!({ files: [] }, ctx), Error, "`recipients`");
  assertEquals(calls.length, 0);
});

Deno.test("document-create: a 422 surfaces SignWell's field errors", async () => {
  const { ctx } = mockCtx([{ status: 422, body: { errors: { recipients: ["is invalid"] } } }]);
  const err = await assertRejects(async () =>
    await action.execute!({ files: [], recipients: [] }, ctx)
  );
  assert((err as Error).message.includes("422") && (err as Error).message.includes("is invalid"));
});
