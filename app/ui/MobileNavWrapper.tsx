export function MobileNavWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full flex-none md:w-64">
      <div className="max-h-10 overflow-hidden md:max-h-none">{children}</div>
    </div>
  );
}
