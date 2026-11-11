import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newForm from "../../triggers/new-form.ts";
import newFolder from "../../triggers/new-folder.ts";
import newSubmissionPoll from "../../triggers/new-submission-poll.ts";

const input = { params: {}, subscriptionId: "sub_1" };
const pageInfo = (totalPages = 1) => ({ pageNumber: 1, pageSize: 500, totalPages });
const form = (id: number) => ({ id, name: `Form ${id}`, active: true, created: "2026-11-09" });
const forms = (ids: number[], totalPages = 1) => ({
  body: { page: pageInfo(totalPages), forms: ids.map(form) },
});
const folder = (id: number) => ({ id, name: `Folder ${id}` });
const folders = (ids: number[], totalPages = 1) => ({
  body: { page: pageInfo(totalPages), folders: ids.map(folder) },
});
const seededOf = (s: unknown) => (s as { seeded?: boolean }).seeded;

test("new-form: seeds, emits only the added form, retries idempotently", async () => {
  const seeded = await newForm.poll!({ ...input, state: {} }, mockCtx([forms([1])]).ctx);
  assertEquals(seeded.events, []);
  assertEquals(seededOf(seeded.nextState), true);
  const run = () =>
    newForm.poll!({ ...input, state: seeded.nextState }, mockCtx([forms([1, 2])]).ctx);
  const result = await run();
  assertEquals(result.events, [form(2)]);
  assertEquals(await run(), result);
});

test("new-form: requests GET /api/v2025/forms?pageSize=500 (literal)", async () => {
  const m = mockCtx([forms([])]);
  await newForm.poll!({ ...input, state: {} }, m.ctx);
  assertEquals(m.calls.length, 1);
  assertEquals(m.calls[0].method, "GET");
  assertEquals(m.calls[0].url, "https://www.formstack.com/api/v2025/forms?pageSize=500");
});

test("new-form: an edit or removal does not emit; a second page fails naming the cap", async () => {
  const seeded = await newForm.poll!({ ...input, state: {} }, mockCtx([forms([1, 2])]).ctx);
  const edited = await newForm.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([{ body: { page: pageInfo(), forms: [{ ...form(1), name: "Renamed" }] } }]).ctx,
  );
  assertEquals(edited.events, []);
  await assertRejects(
    () => newForm.poll!({ ...input, state: {} }, mockCtx([forms([1], 2)]).ctx),
    Error,
    "more than 500 forms",
  );
});

test("new-folder: seeds, emits only the added folder, retries idempotently", async () => {
  const seeded = await newFolder.poll!({ ...input, state: {} }, mockCtx([folders([1])]).ctx);
  assertEquals(seeded.events, []);
  assertEquals(seededOf(seeded.nextState), true);
  const run = () =>
    newFolder.poll!({ ...input, state: seeded.nextState }, mockCtx([folders([1, 2])]).ctx);
  const result = await run();
  assertEquals(result.events, [folder(2)]);
  assertEquals(await run(), result);
});

test("new-folder: requests GET /api/v2025/folders?page=1&perPage=500 (literal)", async () => {
  const m = mockCtx([folders([])]);
  await newFolder.poll!({ ...input, state: {} }, m.ctx);
  assertEquals(m.calls.length, 1);
  assertEquals(m.calls[0].method, "GET");
  assertEquals(m.calls[0].url, "https://www.formstack.com/api/v2025/folders?page=1&perPage=500");
});

test("new-folder: a second page fails naming the cap", async () => {
  await assertRejects(
    () => newFolder.poll!({ ...input, state: {} }, mockCtx([folders([1], 3)]).ctx),
    Error,
    "more than 500 folders",
  );
});

// The V2025 reference (Submissions, list for a form) answers { page, submissions: [...] }.
test("new-submission-poll: reads the V2025 `submissions` array (vendor response shape)", async () => {
  const params = { formId: "1234567" };
  const page = (ids: number[]) => ({
    body: {
      page: pageInfo(),
      submissions: ids.map((id) => ({ id, formId: 1234567, timestamp: "2026-11-10 09:00:00" })),
    },
  });
  const seeded = await newSubmissionPoll.poll!(
    { params, state: {}, subscriptionId: "sub" },
    mockCtx([page([2, 1])]).ctx,
  );
  assertEquals(seeded.events, []);
  const next = await newSubmissionPoll.poll!(
    { params, state: seeded.nextState!, subscriptionId: "sub" },
    mockCtx([page([3, 2, 1])]).ctx,
  );
  assertEquals(next.events, [{ id: 3, formId: 1234567, timestamp: "2026-11-10 09:00:00" }]);
});
