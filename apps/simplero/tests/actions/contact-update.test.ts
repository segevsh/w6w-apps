import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/contact-update.ts";
import { mockCtx, pathOf, recordBody } from "../_helpers.ts";

Deno.test("contact-update: requires the contact id and is idempotent", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, true);
  assertEquals(action.params!.filter((p) => p.required).map((p) => p.key), ["id"]);
});

Deno.test("contact-update: PATCHes /customers/{id} with only the fields set", async () => {
  const { ctx, calls } = mockCtx([{ body: recordBody({ id: 12, last_name: "New" }) }]);
  const out = await action.execute({ id: 12, lastName: "New", doNotSms: false }, ctx) as {
    record: { last_name: string };
  };
  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/api/v2/customers/12");
  assertEquals(JSON.parse(calls[0].body!), { last_name: "New", do_not_sms: false });
  assertEquals(out.record.last_name, "New");
});

Deno.test("contact-update: refuses an update with nothing to change, before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute({ id: 12 }, ctx),
    Error,
    "at least one field",
  );
  assertEquals(calls.length, 0);
});

Deno.test("contact-update: a 404 HTML page is not parsed as an API answer", async () => {
  const { ctx } = mockCtx([
    { status: 404, headers: { "content-type": "text/html" }, body: "<html></html>" },
  ]);
  await assertRejects(
    async () => await action.execute({ id: 99999, lastName: "x" }, ctx),
    Error,
    "HTML page",
  );
});
