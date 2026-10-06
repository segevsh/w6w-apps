import type { ActionDefinition } from "@w6w/types";
import { ClockodoClient, compact, intId, optInt } from "../lib/client.ts";

interface Input {
  customersId: number | string;
  servicesId: number | string;
  projectsId?: number | string;
  subprojectsId?: number | string;
  usersId?: number | string;
  billable?: string;
  text?: string;
  timeSince?: string;
}

const startClock: ActionDefinition<Input> = {
  key: "start-clock",
  type: "perform",
  resource: "clock",
  title: "Start Clock",
  description:
    "Start the clock for a customer and service (POST /v2/clock). A clock already running for the user is stopped and reported in `stopped`. `timeSince` backdates the start.",
  params: [
    {
      key: "customersId",
      label: "Customer ID",
      type: "number",
      required: true,
    },
    {
      key: "servicesId",
      label: "Service ID",
      type: "number",
      required: true,
    },
    {
      key: "projectsId",
      label: "Project ID",
      type: "number",
    },
    {
      key: "subprojectsId",
      label: "Subproject ID",
      type: "number",
    },
    {
      key: "usersId",
      label: "User ID",
      type: "number",
    },
    {
      key: "billable",
      label: "Billable",
      type: "select",
      options: [{ value: "0", label: "Not billable" }, { value: "1", label: "Billable" }, {
        value: "2",
        label: "Billed",
      }, { value: "12", label: "Billable or billed" }],
    },
    {
      key: "text",
      label: "Text",
      type: "string",
    },
    {
      key: "timeSince",
      label: "Time since",
      type: "string",
      hint: "Backdated start, ISO 8601 UTC.",
    },
  ],
  output: [
    { key: "running", type: "object", label: "The now-running entry" },
    { key: "stopped", type: "object", label: "The entry stopped to make room, if any" },
    { key: "current_time", type: "string", label: "Server time" },
  ],
  idempotent: false,

  async execute(input, ctx) {
    const body = await new ClockodoClient(ctx).call("/v2/clock", {
      body: compact({
        customers_id: intId(input.customersId, "customersId"),
        services_id: intId(input.servicesId, "servicesId"),
        projects_id: optInt(input.projectsId, "projectsId"),
        subprojects_id: optInt(input.subprojectsId, "subprojectsId"),
        users_id: optInt(input.usersId, "usersId"),
        billable: input.billable === undefined || input.billable === ""
          ? undefined
          : Number(input.billable),
        text: input.text,
        time_since: input.timeSince,
      }),
    });
    return {
      running: body.running ?? null,
      stopped: body.stopped ?? null,
      current_time: body.current_time ?? null,
    };
  },
};

export default startClock;
