import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, Wrench, CheckCircle, Timer, Sparkles } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  LineChart, Line,
} from 'recharts';

import SummaryCard from '../components/SummaryCard.jsx';
import ReportFilters from '../components/ReportFilters.jsx';
import Pagination from '../components/Pagination.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import StatusModal from '../components/StatusModal.jsx';
import Toast from '../components/Toast.jsx';
import { ThumbsUp } from 'lucide-react';
import { getStats, getWeeklySummary } from '../api/admin.js';
import { listReports } from '../api/reports.js';

const LIMIT = 10;
// Status colors sourced from the CSS design tokens (must stay in sync with --status-* vars).
const STATUS_COLORS_HEX = {
  reported:    '#d97706',
  in_progress: '#2563eb',
  resolved:    '#16a34a',
};

export default function Admin() {
  // Stats
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState('');

  // Table filters
  const [category, setCategory] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sort, setSort] = useState('newest');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);

  // Table data
  const [reports, setReports] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [tableLoading, setTableLoading] = useState(true);
  const [tableError, setTableError] = useState('');

  // Modal + toast
  const [editing, setEditing] = useState(null);
  const [toast, setToast] = useState(null);

  // Weekly summary
  const [summary, setSummary] = useState('');
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState('');

  const handleGenerateSummary = async () => {
    setSummaryError('');
    setSummaryLoading(true);
    try {
      const data = await getWeeklySummary();
      setSummary(data.summary);
    } catch (err) {
      setSummaryError(err.response?.data?.error || 'Could not generate summary.');
    } finally {
      setSummaryLoading(false);
    }
  };

  const closeToast = useCallback(() => setToast(null), []);

  const loadStats = useCallback(() => {
    setStatsLoading(true);
    setStatsError('');
    getStats()
      .then(setStats)
      .catch((err) => setStatsError(err.response?.data?.error || 'Could not load stats.'))
      .finally(() => setStatsLoading(false));
  }, []);

  const loadReports = useCallback(() => {
    setTableLoading(true);
    setTableError('');
    listReports({ category, status: statusFilter, search: searchInput, sort, page, limit: LIMIT })
      .then((data) => {
        setReports(data.reports);
        setTotal(data.total);
        setTotalPages(data.totalPages || 1);
      })
      .catch((err) => setTableError(err.response?.data?.error || 'Could not load reports.'))
      .finally(() => setTableLoading(false));
  }, [category, statusFilter, searchInput, sort, page]);

  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => { loadReports(); }, [loadReports]);

  const applyFilter = (setter) => (v) => {
    setter(v);
    setPage(1);
  };
  const onCategory = applyFilter(setCategory);
  const onStatusFilter = applyFilter(setStatusFilter);
  const onSort = applyFilter(setSort);
  const onSearch = applyFilter(setSearchInput);
  const clearFilters = () => {
    setCategory('');
    setStatusFilter('');
    setSort('newest');
    setSearchInput('');
    setPage(1);
  };

  // Called by the modal after a successful update: toast + refresh everything.
  const handleStatusSaved = (newStatus) => {
    setToast({ message: `Status updated to "${newStatus.replace('_', ' ')}".`, type: 'success' });
    loadReports();
    loadStats();
  };

  // Derived summary values
  const totalReports = stats?.total_reports ?? 0;
  const inProgress = stats?.by_status?.in_progress ?? 0;
  const resolved = stats?.by_status?.resolved ?? 0;
  const avgDays =
    stats?.avg_hours_to_resolve == null ? null : stats.avg_hours_to_resolve / 24;

  // Derived chart data
  const categoryData = stats
    ? Object.entries(stats.by_category).map(([name, value]) => ({ name, value }))
    : [];
  const statusData = stats
    ? Object.entries(stats.by_status).map(([name, value]) => ({ name, value }))
    : [];
  const weekData = stats
    ? stats.by_week.map((w) => ({ name: w.week.slice(5), count: w.count })) // 'MM-DD'
    : [];

  return (
    <div className="page admin">
      <h1>Admin dashboard</h1>

      {/* Summary cards */}
      <div className="summary-grid">
        <SummaryCard icon={<ClipboardList size={20} aria-hidden="true" />} label="Total reports"      value={statsLoading ? '…' : totalReports} />
        <SummaryCard icon={<Wrench       size={20} aria-hidden="true" />} label="In progress"         value={statsLoading ? '…' : inProgress}   accent="blue" />
        <SummaryCard icon={<CheckCircle  size={20} aria-hidden="true" />} label="Resolved"             value={statsLoading ? '…' : resolved}     accent="green" />
        <SummaryCard
          icon={<Timer size={20} aria-hidden="true" />}
          label="Avg days to resolve"
          value={statsLoading ? '…' : avgDays == null ? '—' : avgDays.toFixed(1)}
          accent="amber"
        />
      </div>
      {statsError && <div className="alert alert--error">{statsError}</div>}

      {/* Charts */}
      <div className="charts-grid">
        <div className="chart-card">
          <h2>Reports per category</h2>
          {statsLoading ? (
            <div className="loading">Loading…</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#0f766e" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="chart-card">
          <h2>Status breakdown</h2>
          {statsLoading ? (
            <div className="loading">Loading…</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={statusData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={2}
                >
                  {statusData.map((e) => (
                    <Cell key={e.name} fill={STATUS_COLORS_HEX[e.name] || '#94a3b8'} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="chart-card chart-card--wide">
          <h2>Reports per week (last 8 weeks)</h2>
          {statsLoading ? (
            <div className="loading">Loading…</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={weekData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#16a34a" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Weekly AI Summary */}
      <div className="summary-section">
        <div className="summary-section__header">
          <h2>Weekly summary</h2>
          <button
            type="button"
            className="btn btn--primary btn--icon"
            onClick={handleGenerateSummary}
            disabled={summaryLoading}
          >
            <Sparkles size={15} aria-hidden="true" />
            {summaryLoading ? 'Generating…' : 'Generate AI summary'}
          </button>
        </div>
        {summaryError && <div className="alert alert--error">{summaryError}</div>}
        {summary && (
          <div className="summary-output">
            {summary.split('\n').filter(Boolean).map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        )}
      </div>

      {/* Reports table */}
      <div className="admin__table-section">
        <h2>Manage reports</h2>
        <ReportFilters
          category={category}
          status={statusFilter}
          sort={sort}
          searchInput={searchInput}
          onCategory={onCategory}
          onStatus={onStatusFilter}
          onSort={onSort}
          onSearch={onSearch}
          onClear={clearFilters}
        />

        {tableLoading ? (
          <div className="loading">Loading reports…</div>
        ) : tableError ? (
          <div className="alert alert--error">{tableError}</div>
        ) : reports.length === 0 ? (
          <div className="empty-state">
            <p>No reports match your filters.</p>
            <button type="button" className="btn btn--link" onClick={clearFilters}>Clear</button>
          </div>
        ) : (
          <>
            <div className="table-wrap">
              <table className="reports-table">
                <thead>
                  <tr>
                    <th>Report</th>
                    <th>Category</th>
                    <th>Status</th>
                    <th>
                      <ThumbsUp size={13} aria-label="Upvotes" />
                    </th>
                    <th>Created</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {reports.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <Link to={`/reports/${r.id}`} className="reports-table__title">{r.title}</Link>
                      </td>
                      <td>{r.category}</td>
                      <td><StatusBadge status={r.status} /></td>
                      <td>{r.upvote_count}</td>
                      <td className="reports-table__date">
                        {new Date(r.created_at).toLocaleDateString()}
                      </td>
                      <td>
                        <button type="button" className="btn btn--link" onClick={() => setEditing(r)}>
                          Change status
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="browse__footer">
              <span className="browse__count">{total} report{total !== 1 ? 's' : ''}</span>
              <Pagination page={page} totalPages={totalPages} onChange={setPage} />
            </div>
          </>
        )}
      </div>

      {editing && (
        <StatusModal
          report={editing}
          onClose={() => setEditing(null)}
          onSaved={handleStatusSaved}
        />
      )}

      <Toast message={toast?.message} type={toast?.type} onDone={closeToast} />
    </div>
  );
}
