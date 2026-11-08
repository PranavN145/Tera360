import Image from "next/image";

interface SectionBackgroundProps {
  src: string;
  alt?: string;
  opacity?: string;
  fadeTop?: boolean;
  fadeBottom?: boolean;
}

/**
 * Reusable section background rendering Northeast artwork with full
 * clarity and rich color, using compact edge gradients only at the very
 * top and bottom to seamlessly soften section boundaries without washing
 * out the artwork.
 */
export default function SectionBackground({
  src,
  alt = "",
  opacity = "opacity-95 sm:opacity-100",
  fadeTop = true,
  fadeBottom = true,
}: SectionBackgroundProps) {
  return (
    <div className="absolute inset-0 z-0 pointer-events-none select-none overflow-hidden">
      {/* Background artwork with full clarity & vibrant detail */}
      <Image
        src={src}
        alt={alt}
        fill
        sizes="100vw"
        className={`object-cover object-center pointer-events-none select-none ${opacity}`}
      />

      {/* Subtle top edge transition to prevent hard boundary line */}
      {fadeTop && (
        <div
          className="absolute top-0 left-0 right-0 h-10 sm:h-14 bg-gradient-to-b from-[#F6F4EC] to-transparent pointer-events-none"
          aria-hidden="true"
        />
      )}

      {/* Subtle bottom edge transition to prevent hard boundary line */}
      {fadeBottom && (
        <div
          className="absolute bottom-0 left-0 right-0 h-10 sm:h-14 bg-gradient-to-t from-[#F6F4EC] to-transparent pointer-events-none"
          aria-hidden="true"
        />
      )}
    </div>
  );
}
