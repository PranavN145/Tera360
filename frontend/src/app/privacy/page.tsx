import Header from "@/components/layout/Header";

export default function PrivacyPage() {
  return (
    <div className="relative w-full min-h-screen bg-[#F6F4EC] flex flex-col">
      <Header />

      <main className="flex-1 max-w-[900px] w-full mx-auto px-4 sm:px-6 lg:px-10 pt-28 pb-16 sm:pt-32 sm:pb-20 lg:pt-36 lg:pb-24 text-[#173D32]">
        <div className="mb-10 pb-6 border-b border-[#173D32]/10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#DCE8D4]/60 text-xs font-bold text-[#173D32] uppercase mb-3">
            Governance & Compliance
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Privacy Policy
          </h1>
          <p className="mt-2 text-sm text-[#173D32]/75">
            Effective Date: November 2026 · Terra360 Public Safety Protocol
          </p>
        </div>

        <div className="prose prose-sm max-w-none space-y-6 text-sm text-[#173D32]/85 leading-relaxed font-normal">
          <section>
            <h2 className="text-lg font-bold text-[#173D32] mb-2">1. Purpose & Scope</h2>
            <p>
              Terra360 operates as a disaster-resilience platform for Northeast India. This Privacy Policy outlines how geolocation data, field incident reports, and user verification details are handled to coordinate emergency early-warning operations.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#173D32] mb-2">2. Geolocation and Incident Data</h2>
            <p>
              When submitting observations or viewing localized slope stability data, approximate device coordinates may be requested. Location telemetry collected for incident reporting is strictly utilized to map hazard pins and coordinate clearing machinery.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#173D32] mb-2">3. Inter-Agency Data Sharing</h2>
            <p>
              Reported observations and verified slope deformation alerts are shared in real time with state disaster management authorities (SDMA), Border Roads Organisation (BRO), and public safety dispatchers to protect lives and maintain road links.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#173D32] mb-2">4. Contact & Inquiries</h2>
            <p>
              For queries regarding data privacy practices, contact our team at privacy@terra360.in.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}

