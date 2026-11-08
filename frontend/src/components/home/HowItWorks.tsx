import SectionBackground from "@/components/ui/SectionBackground";

export interface StepItem {
  number: string;
  tag: string;
  title: string;
  description: string;
  icon: (props: { className?: string }) => React.JSX.Element;
}

const STEPS: StepItem[] = [
  {
    number: "01",
    tag: "MONITOR",
    title: "Continuous Field & Satellite Monitoring",
    description:
      "Collect satellite, rainfall, terrain and field observations to monitor vulnerable regions across Northeast India.",
    icon: ({ className }) => (
      <svg
        className={className}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.8}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418"
        />
      </svg>
    ),
  },
  {
    number: "02",
    tag: "ASSESS",
    title: "AI-Powered Risk Assessment",
    description:
      "Analyze environmental conditions and identify areas showing signs of increased landslide risk.",
    icon: ({ className }) => (
      <svg
        className={className}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.8}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.25 2.25L18 6.75"
        />
      </svg>
    ),
  },
  {
    number: "03",
    tag: "ALERT",
    title: "Timely & Actionable Warnings",
    description:
      "Share timely warnings and actionable information with communities and response teams.",
    icon: ({ className }) => (
      <svg
        className={className}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.8}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0M10.5 8.25h3m-3 3h3"
        />
      </svg>
    ),
  },
];

export default function HowItWorks() {
  return (
    <section
      id="about"
      className="relative w-full overflow-hidden bg-[#F6F4EC] py-16 sm:py-20 lg:py-24 px-4 sm:px-6 lg:px-10 xl:px-16 scroll-mt-20 sm:scroll-mt-24"
      aria-label="How Terra360 Works Section"
    >
      {/* Anchor for How It Works navigation */}
      <span id="how-it-works" className="sr-only" aria-hidden="true" />
      {/* Subtle Northeast-inspired background artwork with soft edge fades (section-bg-2) */}
      <SectionBackground src="/images/section-bg-2.png" />

      <div className="relative z-10 max-w-[1340px] mx-auto">
        {/* Section Header */}
        <div className="max-w-2xl mb-12 sm:mb-16">
          {/* Eyebrow Label */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#DCE8D4]/60 border border-[#173D32]/10 text-[12px] font-bold tracking-wider text-[#173D32] uppercase mb-3.5">
            <span className="w-2 h-2 rounded-full bg-[#D6A65D]" />
            HOW TERRA360 WORKS
          </div>

          {/* Heading */}
          <h2 className="text-3xl sm:text-4xl lg:text-[40px] font-bold text-[#173D32] tracking-tight leading-[1.2]">
            From Early Detection to Safer Decisions
          </h2>

          {/* Description */}
          <p className="mt-3.5 text-base sm:text-lg text-[#173D32]/80 leading-relaxed font-normal">
            Terra360 transforms environmental data into actionable warnings through
            continuous monitoring, risk assessment and timely alerts.
          </p>
        </div>

        {/* 3 Visually Connected Steps */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 relative">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            const isLast = index === STEPS.length - 1;

            return (
              <div key={step.number} className="relative flex flex-col">
                {/* Subtle horizontal connecting line on desktop between steps */}
                {!isLast && (
                  <div
                    className="hidden lg:block absolute top-[42px] left-[calc(100%-12px)] w-[24px] xl:w-[32px] h-[2px] border-t-2 border-dashed border-[#173D32]/20 z-0 pointer-events-none"
                    aria-hidden="true"
                  />
                )}

                {/* Step Card */}
                <div className="relative z-10 flex-1 bg-[#FAF8F2] rounded-[20px] border border-[#173D32]/12 p-6 sm:p-8 shadow-[0_4px_20px_-4px_rgba(23,61,50,0.05)] hover:shadow-[0_10px_24px_-4px_rgba(23,61,50,0.09)] transition-all duration-200 flex flex-col justify-between group">
                  <div>
                    {/* Header: Number, Step Tag and Simple Icon */}
                    <div className="flex items-center justify-between gap-3 mb-6">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl sm:text-3xl font-extrabold text-[#D6A65D] tracking-tight">
                          {step.number}
                        </span>
                        <span className="text-xs font-bold tracking-wider text-[#173D32]/75 uppercase bg-[#DCE8D4]/50 px-2.5 py-1 rounded-md border border-[#173D32]/10">
                          {step.tag}
                        </span>
                      </div>

                      {/* Simple Icon Badge */}
                      <div className="w-12 h-12 rounded-xl bg-[#DCE8D4]/60 border border-[#173D32]/12 flex items-center justify-center text-[#173D32] group-hover:bg-[#173D32] group-hover:text-[#F6F4EC] transition-colors duration-200">
                        <Icon className="w-6 h-6" />
                      </div>
                    </div>

                    {/* Step Title */}
                    <h3 className="text-lg sm:text-xl font-bold text-[#173D32] leading-snug mb-3">
                      {step.title}
                    </h3>

                    {/* Step Description */}
                    <p className="text-sm sm:text-[15px] text-[#173D32]/80 leading-relaxed font-normal">
                      {step.description}
                    </p>
                  </div>

                  {/* Subtle step progress indicator bar */}
                  <div className="mt-6 pt-4 border-t border-[#173D32]/10 flex items-center gap-2">
                    <span className="text-xs font-semibold text-[#173D32]/60">
                      Phase {step.number} of 03
                    </span>
                    <span className="flex-1 h-1 rounded-full bg-[#173D32]/10 overflow-hidden">
                      <span
                        className="block h-full bg-[#173D32]/50 rounded-full"
                        style={{ width: `${((index + 1) / 3) * 100}%` }}
                      />
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
