"use client";

import { useApp } from "@/context/AppContext";

export default function ReportDanger() {
  const { openReportModal } = useApp();

  return (
    <section
      id="report"
      className="relative w-full bg-[#F6F4EC] py-12 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-10 xl:px-16 scroll-mt-20 sm:scroll-mt-24"
      aria-label="Report Landslide Danger CTA"
    >
      <div className="max-w-[1340px] mx-auto">
        {/* Full-width Impactful CTA Card */}
        <div className="relative rounded-[28px] sm:rounded-[36px] bg-[#173D32] text-[#F6F4EC] p-7 sm:p-10 lg:p-14 overflow-hidden shadow-[0_16px_40px_-10px_rgba(23,61,50,0.25)] flex flex-col items-center text-center">
          
          {/* Subtle Ambient Background Treatment (Organic soft glows & topo rings) */}
          <div
            className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-[#DCE8D4]/10 blur-3xl pointer-events-none"
            aria-hidden="true"
          />
          <div
            className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-[#D6A65D]/10 blur-3xl pointer-events-none"
            aria-hidden="true"
          />

          {/* Decorative faint concentric contour circle */}
          <svg
            className="absolute -right-16 -bottom-16 w-80 sm:w-96 h-80 sm:h-96 text-white/[0.04] pointer-events-none select-none"
            viewBox="0 0 400 400"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <circle cx="200" cy="200" r="180" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 4" />
            <circle cx="200" cy="200" r="130" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="200" cy="200" r="80" stroke="currentColor" strokeWidth="1.5" strokeDasharray="6 6" />
          </svg>

          {/* Content Wrapper */}
          <div className="relative z-10 max-w-2xl flex flex-col items-center">
            {/* Eyebrow Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#F6F4EC]/10 border border-[#F6F4EC]/20 text-xs font-bold tracking-wider text-[#D6A65D] uppercase mb-4 sm:mb-5">
              <span className="w-2 h-2 rounded-full bg-[#D6A65D] animate-pulse" />
              COMMUNITY OBSERVATION
            </div>

            {/* Heading */}
            <h2 className="text-3xl sm:text-4xl lg:text-[46px] font-bold tracking-tight leading-[1.15] text-[#F6F4EC]">
              Spotted a Landslide Risk?
            </h2>

            {/* Description */}
            <p className="mt-4 sm:mt-5 text-base sm:text-lg text-[#F6F4EC]/85 leading-relaxed font-normal">
              Your observations can help protect communities. Report landslide
              incidents or potentially dangerous conditions in your area.
            </p>

            {/* Centered Action Button: Report an Incident */}
            <div className="mt-7 sm:mt-8 flex justify-center w-full">
              <button
                type="button"
                onClick={openReportModal}
                className="h-[46px] sm:h-[48px] px-6 sm:px-7 rounded-full bg-[#D6A65D] hover:bg-[#c9984e] text-[#173D32] text-[14px] sm:text-[15px] font-bold tracking-wide inline-flex items-center justify-center gap-2 transition-all duration-200 hover:-translate-y-0.5 shadow-md hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D6A65D] cursor-pointer"
              >
                {/* Warning Triangle Icon */}
                <svg
                  className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-[#173D32] shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2.2}
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                  />
                </svg>
                <span>Report an Incident</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
