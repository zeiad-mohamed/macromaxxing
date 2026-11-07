// Ported from the Vite index.html: same title and tagline, favicon now comes
// from src/app/icon.svg (file-based metadata is added to <head> automatically).
import "./globals.css";

export const metadata = {
  title: "MacroMaxxing",
  description: "MacroMaxxing — stack your plate. Max your macros.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="antialiased">
      <body className="text-gray-900">{children}</body>
    </html>
  );
}
