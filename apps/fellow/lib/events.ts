/**
 * The webhook event types Fellow documents on `POST /webhook`
 * ("Valid values: 'ai_note.shared_to_channel', 'ai_note.generated',
 * 'action_item.assigned', 'action_item.completed'").
 */
export const WEBHOOK_EVENTS = [
  "ai_note.generated",
  "ai_note.shared_to_channel",
  "action_item.assigned",
  "action_item.completed",
] as const;

export const EVENT_OPTIONS = WEBHOOK_EVENTS.map((value) => ({ value, label: value }));
