import { assertEquals, assertRejects } from "@std/assert";
import memberCreate from "../../actions/member-create.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("member-create: POSTs plans as [{planId}] and parses JSON-text fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: "mem_new" } } }]);
  const out = await memberCreate.execute({
    email: "j@example.com",
    password: "pw",
    planIds: ["pln_a", "pln_b"],
    customFields: '{"country":"USA"}',
    metaData: { source: "API" },
    loginRedirect: "/dashboard",
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/members");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), {
    email: "j@example.com",
    password: "pw",
    plans: [{ planId: "pln_a" }, { planId: "pln_b" }],
    customFields: { country: "USA" },
    metaData: { source: "API" },
    loginRedirect: "/dashboard",
  });
  assertEquals(out, { member: { id: "mem_new" } });
});

Deno.test("member-create: an invalid-email 400 surfaces with its message and code", async () => {
  const { ctx } = mockCtx([{ status: 400, body: errorBody("Email is invalid", "invalid-email") }]);
  await assertRejects(
    () => Promise.resolve(memberCreate.execute({ email: "nope" }, ctx)),
    Error,
    "Email is invalid (invalid-email)",
  );
});

Deno.test("member-create: non-object customFields is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    () => Promise.resolve(memberCreate.execute({ email: "a@b.c", customFields: "[1]" }, ctx)),
    Error,
    "customFields must be a JSON object",
  );
  assertEquals(calls.length, 0);
});
