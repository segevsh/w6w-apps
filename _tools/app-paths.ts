/** The pack is the source of truth: provider and shared folders are not apps. */
export function appPaths(): string[] {
  const pack = JSON.parse(
    Deno.readTextFileSync(new URL("../w6w-pack.json", import.meta.url)),
  );
  return pack.apps.map((app: { path: string }) =>
    app.path.replace(/^\.\/apps\//, "")
  ).sort();
}

/** Keep CLI shorthand (gmail) as well as explicit paths (google/gmail) working. */
export function appPath(name: string): string {
  if (name.includes("/")) return name;
  const matches = appPaths().filter((path) =>
    path === name || path.endsWith(`/${name}`)
  );
  if (matches.length > 1) {
    throw new Error(`Ambiguous app ${name}: ${matches.join(", ")}`);
  }
  return matches[0] ?? name;
}
