import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/application-feedback-list.ts";

const submission = {
  id: "fb1",
  formDefinition: {
    fields: [
      {
        path: "_overall_recommendation",
        title: "Recommendation",
        type: "ValueSelect",
        selectableValues: [
          { value: "hire", label: "Hire" },
          { value: "no_hire", label: "No Hire" },
        ],
      },
      { path: "_notes", title: "Notes", type: "LongText" },
    ],
  },
  submittedValues: { _overall_recommendation: "hire", _notes: "Strong on systems." },
};

const page = (results: unknown[], extra: Record<string, unknown> = {}) => ({
  status: 200,
  body: { success: true, results, moreDataAvailable: false, ...extra },
});

/**
 * Selections come back as the stored value, not the label shown in Ashby — so
 * a workflow matching on "Hire" matches nothing.
 */
Deno.test("application-feedback-list: resolves stored values to their labels", async () => {
  const { ctx, calls } = mockCtx([page([submission])]);
  const result = await action.execute!({ applicationId: "a1" }, ctx) as {
    submissions: Array<{ labelledValues: Record<string, { value: unknown; label: unknown }> }>;
  };
  assertEquals(calls[0].url, "https://api.ashbyhq.com/applicationFeedback.list");
  const values = result.submissions[0].labelledValues;
  assertEquals(values["_overall_recommendation"].value, "hire");
  assertEquals(values["_overall_recommendation"].label, "Hire");
});

Deno.test("application-feedback-list: a field with no options keeps its raw value", async () => {
  const { ctx } = mockCtx([page([submission])]);
  const result = await action.execute!({}, ctx) as {
    submissions: Array<{ labelledValues: Record<string, { label: unknown }> }>;
  };
  assertEquals(result.submissions[0].labelledValues["_notes"].label, "Strong on systems.");
});

Deno.test("application-feedback-list: a multi-select maps every value", async () => {
  const multi = {
    formDefinition: {
      fields: [{
        path: "_skills",
        type: "MultiValueSelect",
        selectableValues: [
          { value: "sql", label: "SQL" },
          { value: "py", label: "Python" },
        ],
      }],
    },
    submittedValues: { _skills: ["sql", "py"] },
  };
  const { ctx } = mockCtx([page([multi])]);
  const result = await action.execute!({}, ctx) as {
    submissions: Array<{ labelledValues: Record<string, { label: unknown }> }>;
  };
  assertEquals(result.submissions[0].labelledValues["_skills"].label, ["SQL", "Python"]);
});

Deno.test("application-feedback-list: a submission with no form definition survives", async () => {
  const { ctx } = mockCtx([page([{ id: "fb2" }])]);
  const result = await action.execute!({}, ctx) as {
    submissions: Array<{ labelledValues: Record<string, unknown> }>;
  };
  assertEquals(result.submissions[0].labelledValues, {});
});

/** Feedback is candid and about a named person. */
Deno.test("application-feedback-list: logs a count and nothing that was written", async () => {
  const { ctx, logs } = mockCtx([page([submission])]);
  await action.execute!({}, ctx);
  assert(!JSON.stringify(logs).includes("Strong on systems"), JSON.stringify(logs));
  assertEquals(logs[0].data, { count: 1 });
});
