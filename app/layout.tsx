import '@/app/ui/global.css';
import { inter } from '@/app/ui/fonts';
import SideNav from '@/app/ui/sidenav';

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        <div className="flex flex-col md:flex-row  h-screen">
          <div className="w-full flex-none md:w-64">
            <SideNav />
          </div>
          <div className="flex-group-2 w-full">{children}</div>
        </div>
      </body>
    </html>
  );
}
