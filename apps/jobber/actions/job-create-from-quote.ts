import type { ActionDefinition } from "@w6w/types";
import { compact, csv, JOB_FIELDS, JobberClient, unwrap } from "../lib/client.ts";

interface Input {
  quoteId: string;
  createVisits?: boolean;
  notifyTeam?: boolean;
  assignedTo?: string;
  startTime?: string;
  endTime?: string;
  invoicingType?: string;
  invoicingSchedule?: string;
  startAt?: string;
  durationValue?: number;
  durationUnits?: string;
}

const MUTATION = `
  mutation CreateJobFromQuote($quoteId: EncodedId!, $input: JobCreateFromQuoteAttributes!) {
    jobCreateFromQuote(quoteId: $quoteId, input: $input) {
      job { ${JOB_FIELDS} }
      userErrors { message path }
    }
  }
`;

/**
 * Convert an approved quote into a job — the single most load-bearing
 * transition in a field-service workflow, and the one place this app asks for
 * more configuration than feels comfortable. That is Jobber's shape, not a
 * design choice here: `JobCreateFromQuoteAttributes` makes **both**
 * `scheduling` and `invoicing` non-null, on the stated grounds that they are
 * the details "which cannot be inferred from the quote". Client, property, line
 * items and totals all come across from the quote; when the work happens and
 * how it gets billed do not.
 *
 * Inside those two, four fields are non-null in turn:
 *
 *   - `scheduling.createVisits: Boolean!`
 *   - `scheduling.notifyTeam: Boolean!`
 *   - `invoicing.invoicingType: BillingStrategy!` — `FIXED_PRICE` or
 *     `VISIT_BASED`
 *   - `invoicing.invoicingSchedule: BillingFrequencyEnum!` — `ON_COMPLETION`,
 *     `PER_VISIT`, `PERIODIC` or `NEVER`
 *
 * So all four carry defaults here rather than being left to fail at Jobber: a
 * fixed-price job, invoiced on completion, with visits created and the team
 * notified, is the ordinary case.
 *
 * Deliberately not exposed: `scheduling.recurrence`, an `ICalendarRule` string
 * that must be prefixed `RRULE:`. A malformed recurrence silently produces the
 * wrong visit schedule for months, which is not a failure mode to hand a form
 * field. Recurring jobs go through `graphql-query`.
 */
const jobCreateFromQuote: ActionDefinition<Input> = {
  key: "job-create-from-quote",
  type: "perform",
  resource: "job",
  title: "Create Job from Quote",
  description:
    "Convert a quote into a job. Client, property and line items carry over; the scheduling and invoicing terms are set here because Jobber requires them and cannot infer them.",
  idempotent: false,
  params: [
    { key: "quoteId", label: "Quote ID", type: "string", required: true },
    {
      key: "createVisits",
      label: "Create visits",
      type: "boolean",
      default: true,
      hint: "Required by Jobber. False creates the job with no scheduled visits.",
      row: "sched",
    },
    {
      key: "notifyTeam",
      label: "Notify team",
      type: "boolean",
      default: true,
      hint: "Required by Jobber. Emails assignees about the new work.",
      row: "sched",
    },
    {
      key: "assignedTo",
      label: "Assign to user IDs",
      type: "string",
      hint: "Comma-separated EncodedIds, assigned to the job and to any visits created.",
    },
    {
      key: "startTime",
      label: "Visit start time",
      type: "string",
      placeholder: "09:00",
      hint: "Time of day for generated visits (ISO 8601 time, no date).",
      row: "time",
    },
    { key: "endTime", label: "Visit end time", type: "string", placeholder: "11:00", row: "time" },
    {
      key: "invoicingType",
      label: "Billing strategy",
      type: "select",
      default: "FIXED_PRICE",
      required: true,
      options: [
        { value: "FIXED_PRICE", label: "Fixed price" },
        { value: "VISIT_BASED", label: "Per visit" },
      ],
      row: "bill",
    },
    {
      key: "invoicingSchedule",
      label: "Invoicing schedule",
      type: "select",
      default: "ON_COMPLETION",
      required: true,
      options: [
        { value: "ON_COMPLETION", label: "On completion" },
        { value: "PER_VISIT", label: "Per visit" },
        { value: "PERIODIC", label: "Periodic" },
        { value: "NEVER", label: "Never" },
      ],
      row: "bill",
    },
    {
      key: "startAt",
      label: "Job start date",
      type: "date",
      hint: "Date only (ISO 8601). Sets the job's timeframe alongside the duration below.",
      advanced: true,
    },
    { key: "durationValue", label: "Duration", type: "number", advanced: true, row: "dur" },
    {
      key: "durationUnits",
      label: "Duration units",
      type: "select",
      options: [
        { value: "DAYS", label: "Days" },
        { value: "WEEKS", label: "Weeks" },
        { value: "MONTHS", label: "Months" },
        { value: "YEARS", label: "Years" },
      ],
      advanced: true,
      row: "dur",
    },
  ],
  output: [{ key: "job", type: "object", label: "The created job" }],

  async execute(input, ctx) {
    const data = await new JobberClient(ctx).query<Record<string, unknown>>(MUTATION, {
      quoteId: input.quoteId,
      input: compact({
        scheduling: compact({
          createVisits: input.createVisits ?? true,
          notifyTeam: input.notifyTeam ?? true,
          assignedTo: csv(input.assignedTo),
          startTime: input.startTime,
          endTime: input.endTime,
        }),
        invoicing: {
          invoicingType: input.invoicingType ?? "FIXED_PRICE",
          invoicingSchedule: input.invoicingSchedule ?? "ON_COMPLETION",
        },
        timeframe: compact({
          startAt: input.startAt,
          durationValue: input.durationValue,
          durationUnits: input.durationUnits,
        }),
      }),
    });

    return unwrap(data, "jobCreateFromQuote");
  },
};

export default jobCreateFromQuote;
