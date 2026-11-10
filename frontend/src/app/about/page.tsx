import Header from "@/components/layout/Header";
import Link from "next/link";
import { ArrowRight, Megaphone, Mountain, Radar } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="relative w-full min-h-screen bg-[#F6F4EC] flex flex-col">
      <Header />

      <main className="flex-1 max-w-[1100px] w-full mx-auto px-4 sm:px-6 lg:px-10 pt-28 pb-16 sm:pt-32 sm:pb-20 lg:pt-36 lg:pb-24">
        {/* Eyebrow & Title */}
        <div className="max-w-3xl mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#DCE8D4]/60 text-xs font-bold text-[#173D32] uppercase mb-3">
            <span className="w-2 h-2 rounded-full bg-[#D6A65D]" />
            About Terra360
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#173D32] tracking-tight leading-[1.15]">
            Engineering Resilience for Northeast India’s Fragile Slopes
          </h1>
          <p className="mt-4 text-base sm:text-lg text-[#173D32]/85 leading-relaxed font-normal">
            Terra360 is an integrated, next-generation early-warning and disaster-readiness ecosystem engineered specifically for the complex terrain, extreme monsoon precipitations, and critical arterial transit corridors of the eight northeastern states.
          </p>
        </div>

        {/* Pillars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-[#FAF8F2] border border-[#173D32]/12 rounded-2xl p-6 sm:p-7 shadow-xs">
            <div className="w-12 h-12 rounded-xl bg-[#DCE8D4]/70 flex items-center justify-center text-[#173D32] mb-4">
              <Radar className="w-6 h-6" aria-hidden="true" />
            </div>
            <h3 className="text-xl font-bold text-[#173D32] mb-2">Spaceborne Telemetry</h3>
            <p className="text-sm text-[#173D32]/80 leading-relaxed font-normal">
              Utilizing Synthetic Aperture Radar (InSAR) surface deformation mapping and Doppler rainfall estimation to spot micro-millimeters of soil creep before catastrophe strikes.
            </p>
          </div>

          <div className="bg-[#FAF8F2] border border-[#173D32]/12 rounded-2xl p-6 sm:p-7 shadow-xs">
            <div className="w-12 h-12 rounded-xl bg-[#DCE8D4]/70 flex items-center justify-center text-[#173D32] mb-4">
              <Mountain className="w-6 h-6" aria-hidden="true" />
            </div>
            <h3 className="text-xl font-bold text-[#173D32] mb-2">Pore-Water Analytics</h3>
            <p className="text-sm text-[#173D32]/80 leading-relaxed font-normal">
              Continuous monitoring of soil hydrological saturation and slope hydrostatic loads along national highways (NH-29, NH-10, NH-415, and NH-6).
            </p>
          </div>

          <div className="bg-[#FAF8F2] border border-[#173D32]/12 rounded-2xl p-6 sm:p-7 shadow-xs">
            <div className="w-12 h-12 rounded-xl bg-[#DCE8D4]/70 flex items-center justify-center text-[#173D32] mb-4">
              <Megaphone className="w-6 h-6" aria-hidden="true" />
            </div>
            <h3 className="text-xl font-bold text-[#173D32] mb-2">Hyperlocal Alerts</h3>
            <p className="text-sm text-[#173D32]/80 leading-relaxed font-normal">
              Distributing actionable SMS broadcasts, highway digital sign board overrides, and field dispatches directly to SDMA teams and local transit operators.
            </p>
          </div>
        </div>

        {/* Institutional Mission */}
        <div className="bg-[#173D32] text-[#F6F4EC] rounded-[28px] p-8 sm:p-12 mb-12 shadow-lg">
          <span className="text-xs font-bold text-[#D6A65D] uppercase tracking-wider block mb-2">
            Our Mission
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold leading-snug max-w-2xl">
            Bridging the gap between orbital Earth observation and grassroots community survival.
          </h2>
          <p className="mt-4 text-sm sm:text-base text-[#F6F4EC]/80 max-w-3xl leading-relaxed">
            Every year, the monsoon rains trigger hundreds of slope failures cutting off vital supply lines to Kohima, Imphal, Gangtok, and Haflong. Terra360 provides state authorities, border road engineers, and commuters the decisive 4-to-12 hour warning window needed to halt traffic, evacuate vulnerable foothill settlements, and prevent loss of life.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/risk-map"
              className="h-11 px-6 rounded-full bg-[#D6A65D] text-[#173D32] text-sm font-bold flex items-center gap-2 hover:bg-[#c9984e] transition-colors"
            >
              <span>Explore Live Risk Map</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
            <Link
              href="/contact"
              className="h-11 px-6 rounded-full border border-white/30 text-white text-sm font-bold flex items-center gap-2 hover:bg-white/10 transition-colors"
            >
              <span>Contact Control Center</span>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

