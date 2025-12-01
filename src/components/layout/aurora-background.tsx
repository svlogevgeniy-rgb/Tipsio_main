interface AuroraBackgroundProps {
  children?: React.ReactNode;
}

export function AuroraBackground({ children }: AuroraBackgroundProps) {
  return (
    <div className="relative min-h-screen bg-[#020617]">
      {/* Background effects */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        {/* Бирюзовое пятно */}
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] animate-pulse-slow" />
        {/* Коралловое пятно */}
        <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-secondary/10 rounded-full blur-[100px]" />
      </div>
      {/* Content */}
      {children}
    </div>
  );
}
