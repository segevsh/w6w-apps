import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/bulk-find-start.ts";
import { mockCtx, run } from "../_helpers.ts";

Deno.test("bulk-find-start: uploads the file as multipart to /email_finder/bulk", async () => {
  let form: FormData | undefined;
  const { ctx, calls } = mockCtx([{ body: { status: "success", data: { list_id: "F1" } } }]);
  const inner = ctx.fetch;
  ctx.fetch = ((url: string, init: RequestInit) => {
    form = init.body as FormData;
    return inner(url, init);
  }) as typeof fetch;
  const out = await run(action, {
    file: new Blob(["Name,Domain\nA B,x.com"]),
    ignoreDuplicateFile: true,
  }, ctx);
  assertEquals(out.listId, "F1");
  assertEquals(calls[0].url, "https://api.clearout.io/v2/email_finder/bulk");
  assertEquals(await (form!.get("file") as Blob).text(), "Name,Domain\nA B,x.com");
  assertEquals(form!.get("ignore_duplicate_file"), "true");
});

Deno.test("bulk-find-start: a missing file throws before any request", async () => {
  const none = mockCtx();
  await assertRejects(() => run(action, {}, none.ctx), Error, "file is required");
  assertEquals(none.calls.length, 0);
});
