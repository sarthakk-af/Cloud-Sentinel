import "./layout.css";

function DashboardLayout({ children }) {
  return (
    <div className="dashboard">
      <header className="header">
        <h1>☁ Cloud Sentinel</h1>
        <span className="subtitle">Autonomous Infrastructure Monitoring</span>
      </header>

      <main className="content">
        {children}
      </main>
    </div>
  );
}

export default DashboardLayout;
