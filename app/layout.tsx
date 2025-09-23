import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "JAI METRO – Your Luck Lottery Number",
  description: "Jai Metro style site with editable charts",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <main className="flex justify-center">
          <div className="w-full max-w-[1120px] px-3 md:px-6 py-5 md:py-6">
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}
