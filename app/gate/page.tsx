import { PageShell } from '@/components/PageShell';

// Shown by proxy.ts to anyone without the event cookie, at the URL they asked for.
export default function GatePage() {
  return (
    <PageShell>
      <section className="flex flex-col gap-3 rounded-xl bg-card p-[18px]">
        <h2 className="text-xl font-semibold text-text">Ask Dorian for the link</h2>
        <p className="text-[15px] leading-normal text-body">
          This site is for the bachelor weekend. Open it from the link in the group chat.
        </p>
      </section>
    </PageShell>
  );
}
