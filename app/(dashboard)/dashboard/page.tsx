export default function DashboardPage() {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
      <p className="text-muted-foreground">
        Welcome to the Dhanlift admin panel. Summary cards and charts will appear here.
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {["Total Leads", "Active Loans", "Blog Posts", "Lenders"].map((label) => (
          <div
            key={label}
            className="rounded-xl border bg-card p-6 shadow-sm space-y-2"
          >
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <p className="text-3xl font-bold">—</p>
          </div>
        ))}
      </div>
    </div>
  );
}
