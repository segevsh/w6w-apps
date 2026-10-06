import type { ActionDefinition } from "@w6w/types";
import { API, peopleCall, requireEmployeeKey } from "../lib/people.ts";

interface Input {
  checkIn?: string;
  checkOut?: string;
  dateFormat?: string;
  empId?: string;
  emailId?: string;
  mapId?: string;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  altitude?: number;
  location?: string;
}

const DEFAULT_FORMAT = "dd/MM/yyyy HH:mm:ss";

const attendanceCheck: ActionDefinition<Input> = {
  key: "attendance-check",
  type: "perform",
  resource: "attendance",
  title: "Check In / Check Out",
  description:
    "Record a check-in and/or check-out for one employee. Times are `dd/MM/yyyy HH:mm:ss`. Identify the employee by empId, emailId or mapId. For many entries use Zoho's Attendance Bulk Import (not included).",
  idempotent: false,
  params: [
    {
      key: "checkIn",
      label: "Check-in time",
      type: "string",
      placeholder: "09/09/2026 09:30:45",
      hint: "dd/MM/yyyy HH:mm:ss",
    },
    {
      key: "checkOut",
      label: "Check-out time",
      type: "string",
      placeholder: "09/09/2026 18:45:13",
      hint: "dd/MM/yyyy HH:mm:ss",
    },
    { key: "empId", label: "Employee ID", type: "string" },
    { key: "emailId", label: "Employee email", type: "string" },
    { key: "mapId", label: "Mapper ID", type: "string" },
    {
      key: "dateFormat",
      label: "Date format",
      type: "string",
      default: DEFAULT_FORMAT,
      hint: "Only change this if you pass times in another format.",
    },
    { key: "location", label: "Location name", type: "string" },
    { key: "latitude", label: "Latitude", type: "number" },
    { key: "longitude", label: "Longitude", type: "number" },
    { key: "accuracy", label: "GPS accuracy (m)", type: "number" },
    { key: "altitude", label: "Altitude (m)", type: "number" },
  ],
  output: [{ key: "result", type: "object", label: "Vendor response (undocumented shape)" }],

  async execute(input, ctx) {
    requireEmployeeKey(input);
    if (!input.checkIn && !input.checkOut) {
      throw new Error("Provide `checkIn`, `checkOut`, or both.");
    }
    const { result } = await peopleCall(ctx, `${API}/attendance`, {
      method: "POST",
      form: {
        dateFormat: input.dateFormat || DEFAULT_FORMAT,
        checkIn: input.checkIn,
        checkOut: input.checkOut,
        empId: input.empId,
        emailId: input.emailId,
        mapId: input.mapId,
        latitude: input.latitude,
        longitude: input.longitude,
        accuracy: input.accuracy,
        altitude: input.altitude,
        location: input.location,
      },
    });
    return { result };
  },
};

export default attendanceCheck;
