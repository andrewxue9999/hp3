const script = `
(() => {
  const storageKey = "hp3-theme";
  const root = document.documentElement;
  const stored = localStorage.getItem(storageKey);
  const preferred = stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
  const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  const resolved = preferred === "system" ? systemTheme : preferred;
  root.dataset.theme = resolved;
  root.dataset.themePreference = preferred;
})();
`;

export default function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
