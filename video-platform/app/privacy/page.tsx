export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#FBF6EC] text-[#1A1712] px-6 py-16">
      <section className="mx-auto max-w-3xl rounded-[28px] border-2 border-[#1A1712] bg-white p-8 shadow-[8px_8px_0_#1A1712] md:p-12">
        <a href="/" className="mb-8 inline-flex font-black text-[#FF5A1F]">
          ← Back to Localy
        </a>
        <p className="mb-3 text-sm font-extrabold uppercase tracking-[0.16em] text-[#0E8C7F]">
          Localy
        </p>
        <h1 className="text-4xl font-black tracking-tight md:text-6xl">
          Privacy
        </h1>
        <p className="mt-6 text-lg leading-8 text-[#3a342c]">
          Localy helps people discover small businesses nearby. This placeholder
          privacy page exists so the homepage footer links to a real destination
          while the full policy is finalized.
        </p>
        <div className="mt-8 space-y-5 text-[#3a342c]">
          <p>
            We aim to collect only what is needed to operate the product, improve
            discovery, and help customers connect with local businesses.
          </p>
          <p>
            For privacy questions or requests, contact us at
            <a className="font-bold text-[#FF5A1F]" href="mailto:contact@nerfchess.com?subject=Localy%20Privacy">
              {' '}contact@nerfchess.com
            </a>.
          </p>
        </div>
      </section>
    </main>
  );
}
