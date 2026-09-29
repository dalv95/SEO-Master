import { setLocale } from "@/app/actions";
import { getLocale } from "@/lib/i18n";

export async function LocaleSwitcher() {
  const current = await getLocale();
  return (
    <form action={setLocale} className="flex overflow-hidden rounded-md border border-rule text-xs font-semibold">
      {(["pl", "en"] as const).map((l) => (
        <button
          key={l}
          name="locale"
          value={l}
          aria-pressed={current === l}
          className={`px-2 py-1 uppercase ${current === l ? "bg-ink text-paper" : "text-ink-soft hover:text-ink"}`}
        >
          {l}
        </button>
      ))}
    </form>
  );
}
