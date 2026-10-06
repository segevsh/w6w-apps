import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/bulk-verify-start.ts";
import { mockCtx, run } from "../_helpers.ts";

const ok = { body: { status: "success", data: { list_id: "L1" } } };

Deno.test("bulk-verify-start: builds an `Email`-headed CSV from the emails and returns the list ID", async () => {
  const { ctx, calls } = mockCtx([ok]);
  const out = await run(action, {
    emails: "a@x.com, b@x.com\nc@x.com",
    optimize: "fastest_turnaround",
  }, ctx);
  assertEquals(out.listId, "L1");
  assertEquals(calls[0].url, "https://api.clearout.io/v2/email_verify/bulk");
  assertEquals(calls[0].method, "POST");
});

Deno.test("bulk-verify-start: the multipart body carries file, optimize and the duplicate flag", async () => {
  let form: FormData | undefined;
  const { ctx } = mockCtx([ok]);
  const inner = ctx.fetch;
  ctx.fetch = ((url: string, init: RequestInit) => {
    form = init.body as FormData;
    return inner(url, init);
  }) as typeof fetch;
  await run(action, {
    emails: "a@x.com\nb@x.com",
    optimize: "highest_accuracy",
    ignoreDuplicateFile: true,
  }, ctx);
  const file = form!.get("file") as File;
  assertEquals(file.name, "emails.csv");
  assertEquals(await file.text(), "Email\na@x.com\nb@x.com\n");
  assertEquals(form!.get("optimize"), "highest_accuracy");
  assertEquals(form!.get("ignore_duplicate_file"), "true");
});

Deno.test("bulk-verify-start: an uploaded file wins over emails; neither throws", async () => {
  let form: FormData | undefined;
  const { ctx } = mockCtx([ok]);
  const inner = ctx.fetch;
  ctx.fetch = ((url: string, init: RequestInit) => {
    form = init.body as FormData;
    return inner(url, init);
  }) as typeof fetch;
  await run(action, { file: new Blob(["Email\nz@x.com"]), emails: "ignored@x.com" }, ctx);
  assertEquals(await (form!.get("file") as Blob).text(), "Email\nz@x.com");
  assertEquals(form!.has("ignore_duplicate_file"), false);
  await assertRejects(() => run(action, {}, mockCtx().ctx), Error, "provide emails or a file");
});

Deno.test("bulk-verify-start: error 1004 (no email column) surfaces its message", async () => {
  const bad = mockCtx([{
    status: 400,
    body: {
      status: "failed",
      error: { code: 1004, message: "Unable to determine email addresses" },
    },
  }]);
  await assertRejects(() => run(action, { emails: "x" }, bad.ctx), Error, "Unable to determine");
});
