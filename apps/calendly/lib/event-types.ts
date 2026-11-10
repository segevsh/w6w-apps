import type { OutputField } from "@w6w/types";
import type { ResourceEvent } from "./triggers.ts";

/** Output fields shared by the three `event_type.*` triggers (EventTypePayload, 2026-11-10). */
export const eventTypeOutput: OutputField[] = [
  { key: "slug", type: "string", label: "Slug" },
  { key: "active", type: "boolean", label: "Active" },
  { key: "schedulingUrl", type: "string", label: "Scheduling URL" },
  { key: "duration", type: "number", label: "Duration (minutes)" },
  { key: "kind", type: "string", label: "Kind (solo or group)" },
];

export function eventTypeExtract(p: Record<string, unknown>): Record<string, unknown> {
  return {
    slug: typeof p.slug === "string" ? p.slug : null,
    active: typeof p.active === "boolean" ? p.active : null,
    schedulingUrl: typeof p.scheduling_url === "string" ? p.scheduling_url : null,
    duration: typeof p.duration === "number" ? p.duration : null,
    kind: typeof p.kind === "string" ? p.kind : null,
  };
}

export function eventTypeSample(event: string): ResourceEvent {
  return {
    event,
    createdAt: "2026-11-10T10:00:00.000000Z",
    createdBy: "https://api.calendly.com/users/AAAAAAAAAAAAAAAA",
    uri: "https://api.calendly.com/event_types/AAAAAAAAAAAAAAAA",
    name: "30 Minute Meeting",
    email: null,
    slug: "30min",
    active: true,
    schedulingUrl: "https://calendly.com/acme/30min",
    duration: 30,
    kind: "solo",
    payload: {
      uri: "https://api.calendly.com/event_types/AAAAAAAAAAAAAAAA",
      name: "30 Minute Meeting",
      slug: "30min",
      active: true,
    },
  };
}
