import Image from "next/image";
import Header from "../components/layout/Header";
import Hero from "../components/home/Hero";
import RiskMapSection from "../components/home/RiskMapSection";
import LatestAlerts from "../components/home/LatestAlerts";
import HowItWorks from "../components/home/HowItWorks";
import ReportDanger from "../components/home/ReportDanger";

export default function Home() {
  return (
    <div className="relative w-full min-h-screen flex flex-col bg-[#F6F4EC]">
      {/* Hero Scene Section: 100% viewport scene */}
      <div id="home" className="relative w-full min-h-screen lg:h-screen lg:max-h-screen flex flex-col justify-between overflow-hidden bg-[#F6F4EC] scroll-mt-20 sm:scroll-mt-24">
        {/* Landscape background image as full hero background */}
        <div className="absolute inset-0 z-0 pointer-events-none select-none">
          <Image
            src="/images/hero_bg.png"
            alt="Terra360 Landscape Background"
            fill
            priority
            sizes="100vw"
            className="object-cover object-center pointer-events-none select-none"
          />
          {/* Soft, luminous morning-mist warm-white gradient behind hero text for pristine readability */}
          <div
            className="absolute inset-0 bg-gradient-to-r from-[#F6F4EC]/75 via-[#F6F4EC]/35 to-transparent max-w-[62%] pointer-events-none"
            aria-hidden="true"
          />
          {/* Bottom subtle edge transition into #F6F4EC */}
          <div
            className="absolute bottom-0 left-0 right-0 h-10 sm:h-14 bg-gradient-to-t from-[#F6F4EC] to-transparent pointer-events-none"
            aria-hidden="true"
          />
        </div>

        {/* Floating Header */}
        <Header />

        {/* Hero Content */}
        <main className="relative z-10 flex-1 flex flex-col justify-center min-h-0">
          <Hero />
        </main>
      </div>

      {/* Live Risk Monitoring Map Section */}
      <RiskMapSection />

      {/* Latest Landslide Alerts Section */}
      <LatestAlerts />

      {/* How Terra360 Works Section */}
      <HowItWorks />

      {/* Report Landslide Danger Full-Width CTA Section */}
      <ReportDanger />
    </div>
  );
}
