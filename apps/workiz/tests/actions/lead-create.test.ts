import { assertEquals } from "@std/assert";
import leadCreate from "../../actions/lead-create.ts";
import { bodyOf, mockCtx, pathOf, writeAck } from "../_helpers.ts";

Deno.test("lead-create: POSTs the body to /lead/create/ and renames authSecret", async () => {
  const { ctx, calls } = mockCtx([{ body: writeAck([{ UUID: "l1", ClientId: 42, link: "x" }]) }]);
  const out = await leadCreate.execute(
    { authSecret: "sec_xyz", FirstName: "Dana", City: "Austin", ClientId: 42 },
    ctx,
  );

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/lead/create/");
  assertEquals(bodyOf(calls[0]), {
    auth_secret: "sec_xyz",
    FirstName: "Dana",
    City: "Austin",
    ClientId: 42,
  });
  assertEquals(out, { flag: true, data: [{ UUID: "l1", ClientId: 42, link: "x" }] });
});

Deno.test("lead-create: unset optional fields never reach the wire", async () => {
  const { ctx, calls } = mockCtx([{ body: writeAck([]) }]);
  await leadCreate.execute({ authSecret: "sec_1", LastName: "Reyes" }, ctx);
  assertEquals(bodyOf(calls[0]), { auth_secret: "sec_1", LastName: "Reyes" });
});

/** `LeadLost` is an integer flag, and 0 is a value — not an omission. */
Deno.test("lead-create: numeric zero survives the body build", async () => {
  const { ctx, calls } = mockCtx([{ body: writeAck([]) }]);
  await leadCreate.execute({ authSecret: "sec_1", LeadLost: 0 }, ctx);
  assertEquals(bodyOf(calls[0]), { auth_secret: "sec_1", LeadLost: 0 });
});

Deno.test("lead-create: creating is not idempotent", () => {
  assertEquals(leadCreate.idempotent, false);
  assertEquals(leadCreate.type, "perform");
});

Deno.test("lead-create: the record secret is a required plain input, not the credential", () => {
  const secret = leadCreate.params?.find((p) => p.key === "authSecret");
  assertEquals(secret?.required, true);
  assertEquals(secret?.type, "string");
});
