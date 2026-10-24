import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { resolveEventbriteFields } from "../../lib/fields.ts";

const B = "https://www.eventbriteapi.com/v3";
const input = (
  fields: string[],
  form: Record<string, unknown> = {},
  unresolved: string[] = [],
) => ({ fields, form, unresolved, reason: "init" as const });
const items = (prefix: string, n: number) =>
  Array.from({ length: n }, (_, i) => ({ id: `${prefix}${i}`, name: `N${prefix}${i}` }));

Deno.test("organizationId: option shape and URL", async () => {
  const { ctx, calls } = mockCtx([{
    body: { organizations: [{ id: "1", name: "Acme" }], pagination: { has_more_items: false } },
  }]);
  const out = await resolveEventbriteFields(input(["organizationId"]), ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].url, `${B}/users/me/organizations/`);
  assertEquals(out.fields.organizationId?.options, [{ value: "1", label: "Acme" }]);
  assertEquals(Object.keys(out.fields), ["organizationId"]);
});

Deno.test("organizationId: page-number pagination", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: {
        organizations: [{ id: "1", name: "A" }],
        pagination: { has_more_items: true, page_number: 1 },
      },
    },
    {
      body: {
        organizations: [{ id: "2", name: "B" }],
        pagination: { has_more_items: false, page_number: 2 },
      },
    },
  ]);
  const out = await resolveEventbriteFields(input(["organizationId"]), ctx);
  assertEquals(calls[1].url, `${B}/users/me/organizations/?page=2`);
  assertEquals(out.fields.organizationId?.options?.map((o) => o.value), ["1", "2"]);
});

Deno.test("organizationId: continuation pagination", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: {
        organizations: [{ id: "1", name: "A" }],
        pagination: { has_more_items: true, continuation: "tok" },
      },
    },
    { body: { organizations: [{ id: "2", name: "B" }], pagination: { has_more_items: false } } },
  ]);
  const out = await resolveEventbriteFields(input(["organizationId"]), ctx);
  assertEquals(calls[1].url, `${B}/users/me/organizations/?continuation=tok`);
  assertEquals(out.fields.organizationId?.options?.length, 2);
});

Deno.test("organizationId: 1000 cap, no third request", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: {
        organizations: items("a", 600),
        pagination: { has_more_items: true, page_number: 1 },
      },
    },
    {
      body: {
        organizations: items("b", 600),
        pagination: { has_more_items: true, page_number: 2 },
      },
    },
  ]);
  const out = await resolveEventbriteFields(input(["organizationId"]), ctx);
  assertEquals(calls.length, 2);
  assertEquals(out.fields.organizationId?.options?.length, 1000);
});

Deno.test("organizerId: org-scoped, id encoded, no org request", async () => {
  const { ctx, calls } = mockCtx([{
    body: { organizers: [{ id: "9", name: "Org9" }], pagination: { has_more_items: false } },
  }]);
  const out = await resolveEventbriteFields(input(["organizerId"], { organizationId: "a/b" }), ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].url, `${B}/organizations/a%2Fb/organizers/`);
  assertEquals(out.fields.organizerId?.options, [{ value: "9", label: "Org9" }]);
});

Deno.test("organizerId: org-scoped pagination (page + continuation)", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: {
        organizers: [{ id: "1", name: "A" }],
        pagination: { has_more_items: true, page_number: 1 },
      },
    },
    {
      body: {
        organizers: [{ id: "2", name: "B" }],
        pagination: { has_more_items: true, continuation: "c" },
      },
    },
    { body: { organizers: [{ id: "3", name: "C" }], pagination: { has_more_items: false } } },
  ]);
  const out = await resolveEventbriteFields(input(["organizerId"], { organizationId: "5" }), ctx);
  assertEquals(calls[1].url, `${B}/organizations/5/organizers/?page=2`);
  assertEquals(calls[2].url, `${B}/organizations/5/organizers/?continuation=c`);
  assertEquals(out.fields.organizerId?.options?.length, 3);
});

Deno.test("organizerId: org-scoped 1000 cap", async () => {
  const { ctx, calls } = mockCtx([
    { body: { organizers: items("a", 600), pagination: { has_more_items: true, page_number: 1 } } },
    { body: { organizers: items("b", 600), pagination: { has_more_items: true, page_number: 2 } } },
  ]);
  const out = await resolveEventbriteFields(input(["organizerId"], { organizationId: "5" }), ctx);
  assertEquals(calls.length, 2);
  assertEquals(out.fields.organizerId?.options?.length, 1000);
});

Deno.test("organizerId: no org value -> all orgs with description", async () => {
  const noMore = { has_more_items: false };
  const { ctx, calls } = mockCtx([
    {
      body: {
        organizations: [{ id: "1", name: "One" }, { id: "2", name: "Two" }],
        pagination: noMore,
      },
    },
    { body: { organizers: [{ id: "a", name: "A" }], pagination: noMore } },
    { body: { organizers: [{ id: "b", name: "B" }], pagination: noMore } },
  ]);
  const out = await resolveEventbriteFields(input(["organizerId"], { organizationId: "" }), ctx);
  assertEquals(calls.map((c) => c.url), [
    `${B}/users/me/organizations/`,
    `${B}/organizations/1/organizers/`,
    `${B}/organizations/2/organizers/`,
  ]);
  assertEquals(out.fields.organizerId?.options, [
    { value: "a", label: "A", description: "One" },
    { value: "b", label: "B", description: "Two" },
  ]);
});

Deno.test("organizerId: unresolved organizationId -> nothing", async () => {
  const { ctx, calls } = mockCtx([]);
  const out = await resolveEventbriteFields(
    input(["organizerId"], { organizationId: "5" }, ["organizationId"]),
    ctx,
  );
  assertEquals(calls.length, 0);
  assertEquals(out.fields, {});
});

Deno.test("unrequested keys: zero calls, empty fields", async () => {
  const { ctx, calls } = mockCtx([]);
  const out = await resolveEventbriteFields(input(["other"]), ctx);
  assertEquals(calls.length, 0);
  assertEquals(out.fields, {});
});

Deno.test("both requested, org-scoped: orgs then scoped organizers", async () => {
  const noMore = { has_more_items: false };
  const { ctx, calls } = mockCtx([
    { body: { organizations: [{ id: "1", name: "One" }], pagination: noMore } },
    { body: { organizers: [{ id: "a", name: "A" }], pagination: noMore } },
  ]);
  const out = await resolveEventbriteFields(
    input(["organizationId", "organizerId"], { organizationId: "1" }),
    ctx,
  );
  assertEquals(calls.length, 2);
  assertEquals(Object.keys(out.fields).sort(), ["organizationId", "organizerId"]);
});

Deno.test("4xx rejects", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { error: "x" } }]);
  await assertRejects(async () => await resolveEventbriteFields(input(["organizationId"]), ctx));
});
