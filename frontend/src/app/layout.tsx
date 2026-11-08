import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Footer from "../components/layout/Footer";
import { AppProvider } from "../context/AppContext";
import ReportModal from "../components/modals/ReportModal";
import AuthModal from "../components/modals/AuthModal";
import AlertDetailsModal from "../components/modals/AlertDetailsModal";
import ToastContainer from "../components/common/ToastContainer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Terra360 | Landslide Early Warning System",
    template: "%s | Terra360",
  },
  description:
    "Terra360 is a landslide early-warning and disaster management platform for Northeast India.",
  applicationName: "Terra360",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-screen flex flex-col bg-[#F6F4EC]">
        <AppProvider>
          <div className="flex-1 flex flex-col">
            {children}
          </div>
          <Footer />
          <ReportModal />
          <AuthModal />
          <AlertDetailsModal />
          <ToastContainer />
        </AppProvider>
      </body>
    </html>
  );
}
