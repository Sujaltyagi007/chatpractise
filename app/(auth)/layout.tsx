export default function AuthLayout({
    children,
  }: {
    children: React.ReactNode
  }) {
    return (
      <div className="min-h-screen w-full bg-[#030303] text-white flex flex-col justify-between">
        {children}
      </div>
    )
  }

