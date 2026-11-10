import React from "react";
import Image from "next/image";
import Link from "next/link";

export default function PortalFooter() {
  return (
    <footer
      className="relative w-full bg-[#F6F4EC] select-none mt-auto"
      aria-label="Portal Footer"
    >
      {/* Top Mountain Horizon Artwork (y=96..196 of 866x288): spans full width at exact aspect ratio */}
      <div
        className="relative w-full aspect-[866/100] overflow-hidden pointer-events-none select-none"
        aria-hidden="true"
      >
        <Image
          src="/images/footer_bg.png"
          alt=""
          width={866}
          height={288}
          priority
          sizes="100vw"
          className="w-full h-auto block -mt-[11.085%] pointer-events-none select-none"
        />
      </div>

      {/* Dark Green Valley & Tribal Border Base */}
      <div className="relative w-full bg-[#0A4030] -mt-px grid">
        {/* Bottom Pine Silhouettes & Tribal Border Strip (y=196..288 of 866x288): pinned to bottom, exact aspect ratio */}
        <div
          className="col-start-1 row-start-1 self-end w-full aspect-[866/92] overflow-hidden flex items-end pointer-events-none select-none"
          style={{
            WebkitMaskImage:
              "linear-gradient(to bottom, transparent 0%, black 26%, black 100%)",
            maskImage:
              "linear-gradient(to bottom, transparent 0%, black 26%, black 100%)",
          }}
          aria-hidden="true"
        >
          <Image
            src="/images/footer_bg.png"
            alt="Terra360 Footer Landscape"
            width={866}
            height={288}
            priority
            sizes="100vw"
            className="w-full h-auto shrink-0 block pointer-events-none select-none"
          />
        </div>

        {/* Footer Content Container */}
        {/* Centered comfortably inside the dark green valley above the tribal border */}
        <div className="col-start-1 row-start-1 relative z-10 w-full max-w-[1600px] mx-auto px-6 sm:px-8 lg:px-12 pt-5 sm:pt-4 lg:pt-5 pb-[max(2.75rem,5.2vw)] flex items-center">
          <div className="w-full flex flex-col lg:flex-row items-center justify-between gap-5 lg:gap-8">
            
            {/* Left: Footer Logo & Tagline */}
            <div className="flex flex-col items-center lg:items-start gap-2 shrink-0">
              <Link
                href="/"
                className="flex items-center rounded-lg focus-visible:outline-2 focus-visible:outline-white/60 transition-opacity hover:opacity-95"
                aria-label="Terra360 Home"
              >
                <div className="relative w-[175px] sm:w-[200px] lg:w-[220px] h-[50px] sm:h-[58px] lg:h-[64px]">
                  <Image
                    src="/images/footer_logo.png"
                    alt="Terra360"
                    fill
                    sizes="220px"
                    className="object-contain object-center lg:object-left"
                  />
                </div>
              </Link>
              <span className="text-[11px] sm:text-[12.5px] lg:text-[13.5px] font-semibold tracking-[0.25em] text-[#F6F4EC]/85 uppercase pl-0.5 text-center lg:text-left">
                MONITOR · ANALYZE · PROTECT
              </span>
            </div>

            {/* Center: Footer Navigation Links with Vertical Dividers */}
            <nav
              className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-4 text-xs sm:text-[14px] text-[#F6F4EC]/85 font-medium"
              aria-label="Portal Footer Navigation"
            >
              <Link
                href="/about"
                className="hover:text-white transition-colors py-1 focus-visible:outline-2 focus-visible:outline-white/60 rounded-xs"
              >
                About
              </Link>
              <span className="text-[#F6F4EC]/30" aria-hidden="true">|</span>
              <Link
                href="/privacy"
                className="hover:text-white transition-colors py-1 focus-visible:outline-2 focus-visible:outline-white/60 rounded-xs"
              >
                Privacy Policy
              </Link>
              <span className="text-[#F6F4EC]/30" aria-hidden="true">|</span>
              <Link
                href="/terms"
                className="hover:text-white transition-colors py-1 focus-visible:outline-2 focus-visible:outline-white/60 rounded-xs"
              >
                Terms of Use
              </Link>
              <span className="text-[#F6F4EC]/30" aria-hidden="true">|</span>
              <Link
                href="/contact"
                className="hover:text-white transition-colors py-1 focus-visible:outline-2 focus-visible:outline-white/60 rounded-xs"
              >
                Contact
              </Link>
            </nav>

            {/* Right: Social Media Icons & Copyright */}
            <div className="flex flex-col items-center lg:items-end gap-2.5 shrink-0">
              {/* Social Media Circular Icons */}
              <div className="flex items-center gap-3">
                {/* LinkedIn */}
                <a
                  href="https://linkedin.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-full border border-[#F6F4EC]/25 hover:border-[#F6F4EC]/60 bg-[#173D32]/30 hover:bg-[#F6F4EC]/10 flex items-center justify-center text-[#F6F4EC]/85 hover:text-white transition-all text-xs font-bold"
                  aria-label="LinkedIn"
                >
                  <span>in</span>
                </a>

                {/* Instagram */}
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-full border border-[#F6F4EC]/25 hover:border-[#F6F4EC]/60 bg-[#173D32]/30 hover:bg-[#F6F4EC]/10 flex items-center justify-center text-[#F6F4EC]/85 hover:text-white transition-all"
                  aria-label="Instagram"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                    aria-hidden="true"
                  >
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                    <path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z" />
                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                  </svg>
                </a>

                {/* GitHub */}
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-full border border-[#F6F4EC]/25 hover:border-[#F6F4EC]/60 bg-[#173D32]/30 hover:bg-[#F6F4EC]/10 flex items-center justify-center text-[#F6F4EC]/85 hover:text-white transition-all"
                  aria-label="GitHub"
                >
                  <svg
                    className="w-4 h-4 fill-current"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                    />
                  </svg>
                </a>
              </div>

              {/* Copyright Note */}
              <p className="text-xs text-[#F6F4EC]/70 font-normal">
                © 2026 Terra360. All rights reserved.
              </p>
            </div>

          </div>
        </div>
      </div>
    </footer>
  );
}
