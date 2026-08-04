export function KpiSkeleton() {
  return (
    <div className="kpi-grid">
      {Array.from({ length: 6 }).map((_, i) => (
        <div className="kpi-card" key={i}>
          <div className="skeleton" style={{ height: 10, width: '60%', marginBottom: 10 }} />
          <div className="skeleton" style={{ height: 22, width: '80%' }} />
        </div>
      ))}
    </div>
  );
}

export function ChartSkeleton({ height = 280 }) {
  return (
    <div className="panel">
      <div className="skeleton" style={{ height: 14, width: '30%', marginBottom: 14 }} />
      <div className="skeleton" style={{ height }} />
    </div>
  );
}
