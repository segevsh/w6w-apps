import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/create-client-record.ts";
import { API_ROOT, bodyOf, mockCtx, urlOf } from "../_helpers.ts";

const created = { id: "rec-9", isActive: true, client: { emailAddress: "ada@example.com" } };

Deno.test("create-client-record: POSTs the profile to /consultant/records", async () => {
  const { ctx, calls } = mockCtx([{ body: created }]);
  const result = await action.execute({
    profile: { emailAddress: "ada@example.com", firstName: "Ada", lastName: "Lovelace" },
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(urlOf(calls[0]), `${API_ROOT}/consultant/records`);
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(bodyOf(calls[0]).profile, {
    emailAddress: "ada@example.com",
    firstName: "Ada",
    lastName: "Lovelace",
  });
  assertEquals(result, created);
});

Deno.test("create-client-record: optional body fields are sent only when set", async () => {
  const { ctx, calls } = mockCtx([{ body: created }]);
  await action.execute({
    profile: { emailAddress: "ada@example.com", firstName: "Ada", lastName: "Lovelace" },
    isActive: false,
    parentRecordId: "rec-parent",
    formIds: ["form-1", "form-2"],
    sendInvitation: true,
    documentsFolder: true,
  }, ctx);
  const body = bodyOf(calls[0]);
  assertEquals(body.isActive, false);
  assertEquals(body.parentRecordId, "rec-parent");
  assertEquals(body.formIds, ["form-1", "form-2"]);
  assertEquals(body.sendInvitation, true);
  assertEquals(body.documentsFolder, true);

  const bare = mockCtx([{ body: created }]);
  await action.execute({
    profile: { emailAddress: "ada@example.com", firstName: "Ada", lastName: "Lovelace" },
  }, bare.ctx);
  assertEquals(Object.keys(bodyOf(bare.calls[0])), ["profile"]);
});

Deno.test("create-client-record: a missing profile is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute({ profile: undefined as unknown }, ctx),
    Error,
    "profile is required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("create-client-record: a 409 is surfaced with the conflict explanation", async () => {
  const { ctx } = mockCtx([{
    status: 409,
    body: { message: "A record already exists for this client." },
  }]);
  await assertRejects(
    async () =>
      await action.execute({
        profile: { emailAddress: "ada@example.com", firstName: "Ada", lastName: "Lovelace" },
      }, ctx),
    Error,
    "HTTP 409",
  );
});

Deno.test("create-client-record: it is not idempotent — a retry creates a second record", () => {
  assertEquals(action.idempotent, false);
  assertEquals(action.params!.find((p) => p.key === "profile")!.required, true);
});
