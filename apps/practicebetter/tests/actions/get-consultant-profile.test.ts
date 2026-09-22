import { assertEquals } from "@std/assert";
import action from "../../actions/get-consultant-profile.ts";
import { API_ROOT, mockCtx, queryOf, urlOf } from "../_helpers.ts";

const profile = {
  id: "con-1",
  emailAddress: "practitioner@example.com",
  activationStatus: "active",
  isOwner: true,
  company: { id: "co-1", name: "Whole Health" },
};

Deno.test("get-consultant-profile: reads /consultant/profile", async () => {
  const { ctx, calls } = mockCtx([{ body: profile }]);
  const result = await action.execute({}, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(urlOf(calls[0]), `${API_ROOT}/consultant/profile`);
  assertEquals(result, profile);
});

Deno.test("get-consultant-profile: as_consultant is sent only when supplied", async () => {
  const bare = mockCtx([{ body: profile }]);
  await action.execute({}, bare.ctx);
  assertEquals(new URL(bare.calls[0].url).search, "");

  const scoped = mockCtx([{ body: profile }]);
  await action.execute({ as_consultant: "con-2" }, scoped.ctx);
  assertEquals(queryOf(scoped.calls[0].url).as_consultant, "con-2");
});

Deno.test("get-consultant-profile: output surfaces the identity and authority fields", () => {
  assertEquals(action.type, "read");
  assertEquals(action.resource, "consultant");
  assertEquals((action.output as Array<{ key: string }>).map((o) => o.key), [
    "id",
    "emailAddress",
    "activationStatus",
    "isOwner",
    "isAssistant",
    "dateCreated",
    "dateModified",
    "company",
  ]);
});
