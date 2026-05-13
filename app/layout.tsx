import '@/app/ui/global.css';
import { inter } from '@/app/ui/fonts';
import SideNav from '@/app/ui/sidenav';
import { MobileNavWrapper } from '@/app/ui/MobileNavWrapper';

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        <div className="flex flex-col md:flex-row  h-screen">
          <MobileNavWrapper>
            <SideNav />
          </MobileNavWrapper>
          <div className="flex-group-2 w-full">{children}</div>
        </div>
      </body>
    </html>
  );
}
