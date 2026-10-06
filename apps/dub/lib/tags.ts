export const TAG_COLORS = ["red", "yellow", "green", "blue", "purple", "brown", "gray", "pink"]
  .map((value) => ({ value, label: value[0].toUpperCase() + value.slice(1) }));

export const TAG_OUTPUT = [
  { key: "id", type: "string" as const, label: "Tag ID" },
  { key: "name", type: "string" as const, label: "Name" },
  { key: "color", type: "string" as const, label: "Color" },
];
