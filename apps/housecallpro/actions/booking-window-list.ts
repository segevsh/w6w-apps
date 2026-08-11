import type { ActionDefinition } from "@w6w/types";
import { HousecallClient, toList } from "../lib/client.ts";
import { companyIdParam } from "../lib/params.ts";

/**
 * `GET /company/schedule_availability/booking_windows` — bookable slots.
 *
 * The window size has a documented three-step resolution order, changed on
 * 2026-02-18 and worth stating because the old behaviour was a flat 30 minutes:
 *
 *   1. `service_duration`, when given — it overrides everything;
 *   2. otherwise the configured duration of `service_id`, from the company's
 *      Online Booking settings;
 *   3. otherwise 30 minutes, kept for backward compatibility.
 *
 * `start_date` defaults to "the next day with an available booking window", not
 * to today, and `show_for_days` defaults to 7.
 */
interface Input {
  showForDays?: number;
  startDate?: string;
  serviceId?: string;
  serviceDuration?: number;
  priceFormId?: string;
  employeeIds?: string[] | string;
  companyId?: string;
}

const bookingWindowList: ActionDefinition<Input> = {
  key: "booking-window-list",
  type: "read",
  resource: "schedule",
  title: "List Booking Windows",
  description:
    "List the windows a job or estimate can be booked into, from the company's Online Booking " +
    "settings and the employees' actual open slots.",
  params: [
    {
      key: "showForDays",
      label: "Days to show",
      type: "number",
      hint: "Defaults to 7.",
    },
    {
      key: "startDate",
      label: "Start date",
      type: "datetime",
      hint:
        "ISO-8601 (YYYY-MM-DDTHH:MM:SS). Defaults to the next day that has an available window, " +
        "not to today.",
    },
    {
      key: "serviceId",
      label: "Service ID",
      type: "string",
      hint: "Filters to the employees assigned to this service, and uses its configured duration.",
    },
    {
      key: "serviceDuration",
      label: "Service duration (minutes)",
      type: "number",
      validation: { integer: true, min: 1 },
      hint: "Overrides the duration a Service ID would imply. Falls back to 30 minutes.",
    },
    { key: "priceFormId", label: "Price form ID", type: "string" },
    {
      key: "employeeIds",
      label: "Employee IDs",
      type: "string",
      hint: "Comma-separated employee ids to restrict availability to.",
    },
    companyIdParam,
  ],
  output: [
    { key: "booking_windows", type: "array", label: "Booking windows" },
    { key: "show_for_days", type: "number", label: "Days shown" },
    { key: "start_date", type: "string", label: "Start date used" },
  ],

  execute(input, ctx) {
    return new HousecallClient(ctx).json("/company/schedule_availability/booking_windows", {
      companyId: input.companyId,
      query: {
        show_for_days: input.showForDays,
        start_date: input.startDate,
        service_id: input.serviceId,
        service_duration: input.serviceDuration,
        price_form_id: input.priceFormId,
        employee_ids: toList(input.employeeIds),
      },
    });
  },
};

export default bookingWindowList;
