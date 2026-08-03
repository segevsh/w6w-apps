import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/visit-create.ts";

const OK = {
  body: {
    data: { visitCreate: { createdVisits: [{ id: "v1" }], job: { id: "j1" }, userErrors: [] } },
  },
};

Deno.test("visit-create: the schedule is wall-clock — date, time and timezone, not a timestamp", async () => {
  const { ctx, calls } = mockCtx([OK]);
  await action.execute({
    jobId: "j1",
    title: "Spring service",
    startDate: "2026-08-10",
    startTime: "09:00",
    endDate: "2026-08-10",
    endTime: "11:00",
    timezone: "America/Denver",
    assignedTo: "u1,u2",
    notifyTeam: true,
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!).variables, {
    jobId: "j1",
    input: {
      visits: [{
        title: "Spring service",
        schedule: {
          notifyTeam: true,
          teamMemberIdsToAssign: ["u1", "u2"],
          startAt: { date: "2026-08-10", time: "09:00", timezone: "America/Denver" },
          endAt: { date: "2026-08-10", time: "11:00", timezone: "America/Denver" },
        },
      }],
    },
  });
});

Deno.test("visit-create: omitting the time makes it an all-day visit", async () => {
  const { ctx, calls } = mockCtx([OK]);
  await action.execute({ jobId: "j1", startDate: "2026-08-10", timezone: "UTC" }, ctx);
  const startAt = JSON.parse(calls[0].body!).variables.input.visits[0].schedule.startAt;
  assertEquals(startAt, { date: "2026-08-10", timezone: "UTC" });
});

Deno.test("visit-create: omitting the date entirely creates an unscheduled visit", async () => {
  const { ctx, calls } = mockCtx([OK]);
  await action.execute({ jobId: "j1", title: "To be booked" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).variables.input.visits[0], { title: "To be booked" });
});

Deno.test("visit-create: a date without a timezone fails locally, before any call", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute({ jobId: "j1", startDate: "2026-08-10" }, ctx),
    Error,
    "needs a timezone",
  );
  assertEquals(calls.length, 0);
});

Deno.test("visit-create: userErrors throws", async () => {
  const { ctx } = mockCtx([{
    body: {
      data: {
        visitCreate: {
          createdVisits: [],
          job: { id: "j1" },
          userErrors: [{ message: "Job is archived" }],
        },
      },
    },
  }]);
  await assertRejects(
    async () => await action.execute({ jobId: "j1" }, ctx),
    Error,
    "Job is archived",
  );
});
