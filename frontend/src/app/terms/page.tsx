import Header from "@/components/layout/Header";

export default function TermsPage() {
  return (
    <div className="relative w-full min-h-screen bg-[#F6F4EC] flex flex-col">
      <Header />

      <main className="flex-1 max-w-[900px] w-full mx-auto px-4 sm:px-6 lg:px-10 pt-28 pb-16 sm:pt-32 sm:pb-20 lg:pt-36 lg:pb-24 text-[#173D32]">
        <div className="mb-10 pb-6 border-b border-[#173D32]/10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#DCE8D4]/60 text-xs font-bold text-[#173D32] uppercase mb-3">
            Operational Guidelines
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Terms of Use
          </h1>
          <p className="mt-2 text-sm text-[#173D32]/75">
            Effective Date: November 2026 · Terra360 Platform Terms
          </p>
        </div>

        <div className="prose prose-sm max-w-none space-y-6 text-sm text-[#173D32]/85 leading-relaxed font-normal">
          <section>
            <h2 className="text-lg font-bold text-[#173D32] mb-2">1. Early-Warning Advisory Notice</h2>
            <p>
              Terra360 aggregates satellite InSAR deformation, rainfall radar estimations, and community observations to generate predictive landslide alerts. While models are verified with high precision, mountainous weather and seismic conditions in Northeast India may vary rapidly.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#173D32] mb-2">2. Emergency Decision-Making</h2>
            <p>
              Alert classifications (Critical, Warning, Watch) serve as situational intelligence. Motorists and freight carriers must obey physical roadblocks, police advisories, and BRO safety orders on highway corridors.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#173D32] mb-2">3. Field Reporting Conduct</h2>
            <p>
              Users agree to submit truthful, current ground observations. Submitting knowingly false reports that divert emergency machinery is strictly prohibited and subject to regional disaster authority review.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}

