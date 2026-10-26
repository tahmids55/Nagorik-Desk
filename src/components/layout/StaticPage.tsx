import { getT } from "@/i18n/server";
import { PAGES } from "@/content/pages";

export async function StaticPage({ page }: { page: keyof typeof PAGES }) {
  const { lang, t } = await getT();
  const p = PAGES[page][lang];
  return (
    <article className="mx-auto max-w-[760px] px-4 py-8">
      <h1 className="text-2xl sm:text-3xl font-semibold">{p.title}</h1>
      {p.draft && <p className="mt-3 rounded-[3px] border border-warn/40 bg-warn/10 px-4 py-2.5 text-sm text-warn">{t("draft_notice")}</p>}
      {p.intro && <p className="mt-4 text-lg text-muted">{p.intro}</p>}
      <div className="mt-8 space-y-7">
        {p.sections.map((s) => (
          <section key={s.title}>
            <h2 className="text-lg font-semibold">{s.title}</h2>
            {s.body.map((para) => (
              <p key={para} className="mt-2 text-[15px] leading-relaxed text-ink/90">
                {para}
              </p>
            ))}
          </section>
        ))}
      </div>
    </article>
  );
}
