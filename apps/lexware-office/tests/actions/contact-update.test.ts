import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/contact-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("contact-update: PUTs the body with the caller's version overriding any inside it", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "c1", version: 5 } }]);
  const out = await action.execute({
    id: "c1",
    version: 4,
    contact: { version: 0, roles: { customer: {} }, person: { lastName: "Neu" } },
  }, ctx) as { version: number };
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/v1/contacts/c1");
  assertEquals(JSON.parse(calls[0].body!).version, 4);
  assertEquals(JSON.parse(calls[0].body!).person, { lastName: "Neu" });
  assertEquals(out.version, 5);
});

Deno.test("contact-update: a stale version surfaces the 409 with guidance", async () => {
  const { ctx } = mockCtx([{ status: 409, body: { status: 409, message: "Conflict" } }]);
  const err = await assertRejects(
    async () => await action.execute({ id: "c1", version: 1, contact: "{}" }, ctx),
    Error,
  );
  assert(err.message.includes("409") && err.message.includes("version"));
});

Deno.test("contact-update: requires id, integer version and an object", async () => {
  const n = mockCtx();
  await assertRejects(
    async () => await action.execute({ id: "", version: 1, contact: {} }, n.ctx),
    Error,
    "id",
  );
  await assertRejects(
    async () => await action.execute({ id: "a", version: 1.5, contact: {} }, n.ctx),
    Error,
    "Version",
  );
  await assertRejects(
    async () => await action.execute({ id: "a", version: 1, contact: [] }, n.ctx),
    Error,
    "object",
  );
  assertEquals(n.calls.length, 0);
});
