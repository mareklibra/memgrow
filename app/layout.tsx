import '@/app/ui/global.css';
import { inter } from '@/app/ui/fonts';
import SideNav from '@/app/ui/sidenav';
import { MobileNavWrapper } from '@/app/ui/MobileNavWrapper';
import { PendingBatchRecovery } from '@/app/ui/PendingBatchRecovery';
import { getI18n } from '@/app/lib/i18n/get-i18n';
import { I18nProvider } from '@/app/lib/i18n/I18nProvider';
import { LocaleSync } from '@/app/lib/i18n/LocaleSync';

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { locale, messages, persistLocale } = await getI18n();

  return (
    <html lang={locale}>
      <body className={`${inter.className} antialiased`}>
        <I18nProvider locale={locale} messages={messages}>
          <LocaleSync persistLocale={persistLocale} />
          <div className="flex flex-col md:flex-row  h-screen">
            <MobileNavWrapper>
              <SideNav />
            </MobileNavWrapper>
            <div className="flex-group-2 w-full">
              <PendingBatchRecovery />
              {children}
            </div>
          </div>
        </I18nProvider>
      </body>
    </html>
  );
}
