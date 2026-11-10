"use client";

import Image from "next/image";

export default function Hero() {
  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    const target = document.getElementById(id);
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <section
      className="relative w-full flex-1 flex items-center overflow-hidden"
      aria-label="Terra360 — Landslide Early-Warning Platform for Northeast India"
    >
      {/* Container: balanced spacing between left text and right floating map */}
      <div className="w-full h-full flex flex-col lg:flex-row items-center justify-between pl-6 sm:pl-10 lg:pl-[6%] pr-6 sm:pr-10 lg:pr-[5%] py-6 lg:py-0 gap-8 lg:gap-10 max-w-full min-w-0">
        {/* Left Side: Hero Text Content (Compact scaled down by ~15-20%) */}
        <div className="w-full max-w-[580px] xl:max-w-[620px] flex flex-col items-start text-left z-10 min-w-0">
          {/* Headline: 58-64px on desktop, first line green #173D32, second line italic ochre #D6A65D */}
          <h1
            className="text-[36px] sm:text-[46px] lg:text-[58px] xl:text-[64px] font-[780] leading-[1.1] tracking-tight select-none"
            style={{ fontWeight: 780 }}
          >
            {/* First line: Forest Green #173D32 */}
            <span className="block text-[#173D32]">Know the Risk.</span>

            {/* Second line: Ochre #D6A65D, italic with warm organic brush-stroke underline */}
            <span className="relative inline-block mt-1 sm:mt-1.5">
              <span className="block text-[#D6A65D] italic">Stay Ahead.</span>
              <svg
                className="w-40 sm:w-52 lg:w-[230px] h-2.5 sm:h-3 text-[#D6A65D] mt-1"
                viewBox="0 0 250 12"
                fill="currentColor"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path d="M2 9.5C35 7.5 90 5.2 160 5.2C200 5.2 235 6.8 248 8.8C235 9.8 195 10.8 150 10.8C85 10.8 35 10.2 2 9.5Z" />
              </svg>
            </span>
          </h1>

          {/* Description: 18px font size, line-height 1.65, max-width ~600px, color #173D32 */}
          <p className="mt-4 sm:mt-5 text-[16px] sm:text-[18px] leading-[1.65] text-[#173D32] max-w-[600px] font-normal">
            Real-time monitoring, AI-based risk prediction and timely alerts to
            keep communities, roads and lives safe across Northeast India.
          </p>

          {/* CTA Buttons: sleek & compact, rounded-full */}
          <div className="mt-6 sm:mt-7 lg:mt-8 flex flex-wrap items-center gap-3.5 sm:gap-4 w-full sm:w-auto">
            {/* Primary Button: View Risk Map */}
            <a
              href="#risk-map"
              onClick={(e) => scrollToSection(e, "risk-map")}
              className="h-[46px] sm:h-[48px] px-5 sm:px-6 rounded-full text-[14px] sm:text-[15px] font-semibold text-white bg-[#173D32] hover:bg-[#1a4437] inline-flex items-center justify-center gap-2 transition-all duration-200 hover:-translate-y-0.5 shadow-md hover:shadow-lg group focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#173D32] cursor-pointer"
            >
              {/* Map Icon */}
              <svg
                className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-white shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                />
              </svg>
              <span>View Risk Map</span>
              <span
                className="transition-transform duration-200 group-hover:translate-x-1"
                aria-hidden="true"
              >
                →
              </span>
            </a>

            {/* Secondary Button: Report Danger (Directs smoothly to last section) */}
            <a
              href="#report"
              onClick={(e) => scrollToSection(e, "report")}
              className="h-[46px] sm:h-[48px] px-5 sm:px-6 rounded-full text-[14px] sm:text-[15px] font-semibold text-[#173D32] bg-[#F6F4EC] hover:bg-[#ECE8DC] border-2 border-[#173D32] inline-flex items-center justify-center gap-2 transition-all duration-200 hover:-translate-y-0.5 shadow-sm hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#173D32] cursor-pointer"
            >
              {/* Warning Triangle Icon */}
              <svg
                className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-[#173D32] shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                />
              </svg>
              <span>Report Danger</span>
            </a>

            {/* Tertiary Button: Field Officer Portal */}
            <a
              href="/officer"
              className="h-[46px] sm:h-[48px] px-5 sm:px-5.5 rounded-full text-[14px] sm:text-[15px] font-semibold text-[#173D32] bg-[#DCE8D1]/70 hover:bg-[#DCE8D1] border border-[#173D32]/25 inline-flex items-center justify-center gap-2 transition-all duration-200 hover:-translate-y-0.5 shadow-xs hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#173D32] cursor-pointer"
            >
              <span>👮</span>
              <span>Officer Portal</span>
            </a>
          </div>
        </div>

        {/* Right Side: Map Illustration FLOATING INDEPENDENTLY (decreased size by little & moved leftwards) */}
        <div className="w-full lg:w-auto flex items-center justify-center lg:justify-end z-10 shrink-0 -translate-y-4 sm:-translate-y-6 lg:-translate-y-12 xl:-translate-y-14 lg:-translate-x-12 xl:-translate-x-16">
          <div className="relative w-[300px] sm:w-[370px] lg:w-[430px] xl:w-[455px] max-w-full aspect-[1414/1112] animate-float drop-shadow-[0_20px_35px_rgba(23,61,50,0.18)]">
            <Image
              src="/images/map.png"
              alt="Northeast India Landslide Risk Map and Risk Level Legend"
              fill
              priority
              sizes="(max-width: 640px) 300px, (max-width: 1024px) 370px, 455px"
              className="object-contain pointer-events-none select-none"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
