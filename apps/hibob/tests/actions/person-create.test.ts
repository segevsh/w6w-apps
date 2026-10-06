import { assertEquals, assertRejects } from "@std/assert";
import personCreate from "../../actions/person-create.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

const base = {
  email: "new@x.io",
  firstName: "New",
  surname: "Hire",
  site: "London",
  startDate: "2026-11-01",
};

Deno.test("person-create: POSTs the documented minimum with work nested", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "99", email: "new@x.io" } }]);
  const out = await personCreate.execute(base, ctx) as { id: string };
  assertEquals(pathOf(calls[0].url), "/v1/people");
  assertEquals(bodyOf(calls[0]), {
    email: "new@x.io",
    firstName: "New",
    surname: "Hire",
    work: { site: "London", startDate: "2026-11-01" },
  });
  assertEquals(out.id, "99");
});

Deno.test("person-create: includes department and title when given", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await personCreate.execute({ ...base, department: "Eng", title: "Dev" }, ctx);
  assertEquals((bodyOf(calls[0]) as { work: object }).work, {
    site: "London",
    startDate: "2026-11-01",
    department: "Eng",
    title: "Dev",
  });
});

Deno.test("person-create: rejects a malformed start date before calling", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    () => Promise.resolve(personCreate.execute({ ...base, startDate: "01/11/2026" }, ctx)),
    Error,
    "YYYY-MM-DD",
  );
  assertEquals(calls.length, 0);
});

Deno.test("person-create: a duplicate (400) keeps the vendor message", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { error: "Duplicate employee" } }]);
  await assertRejects(
    () => Promise.resolve(personCreate.execute(base, ctx)),
    Error,
    "Duplicate employee",
  );
});
