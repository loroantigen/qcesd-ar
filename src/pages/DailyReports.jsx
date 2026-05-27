import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useStore } from '../store/useStore';
import { format, parseISO, isWeekend, eachDayOfInterval, startOfMonth, endOfMonth } from 'date-fns';
import {
  Search, Filter, FileText, Download, Calendar,
  ChevronLeft, ChevronRight, AlertCircle
} from 'lucide-react';
import Button from '../components/ui/Button';
import { generateAccomplishmentPDF } from '../utils/pdfGenerator';
import toast from 'react-hot-toast';

const DEFAULT_PH_HOLIDAYS = [
  '2026-01-01', '2026-04-09', '2026-04-17', '2026-04-18',
  '2026-05-01', '2026-06-12', '2026-08-25', '2026-11-30',
  '2026-12-25', '2026-12-30',
];

const DailyReports = () => {
  const { userData } = useStore();
  const [reports,         setReports]         = useState([]);
  const [filteredReports, setFilteredReports] = useState([]);
  const [settings,        setSettings]        = useState(null);
  const [dateRange,       setDateRange]       = useState({
    startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    endDate:   format(endOfMonth(new Date()),   'yyyy-MM-dd'),
  });
  const [searchTerm,  setSearchTerm]  = useState('');
  const [isLoading,   setIsLoading]   = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 31;

  // ── STRICT role check — only 'admin' can see all reports ─────────────────────
  const isAdmin = userData?.role === 'admin';

  const getHolidaySet = () => {
    const list = settings?.holidays;
    if (Array.isArray(list) && list.length > 0) {
      return new Set(list.map(h => (typeof h === 'string' ? h : h.date)));
    }
    return new Set(DEFAULT_PH_HOLIDAYS);
  };

  const fetchSettings = async () => {
    try {
      const snap = await getDoc(doc(db, 'settings', 'general'));
      if (snap.exists()) setSettings(snap.data());
    } catch {
      // Use defaults
    }
  };

  // ── Fetch reports — ALWAYS filter by uid for non-admins ──────────────────────
  const fetchReports = async () => {
    if (!userData?.uid) return;   // Guard: never fetch without a known user

    setIsLoading(true);
    try {
      const reportsRef = collection(db, 'dailyreports');

      // Employees always get their own uid filter — no exceptions
      const q = isAdmin
        ? query(reportsRef)
        : query(reportsRef, where('uid', '==', userData.uid));

      const snapshot = await getDocs(q);

      // Secondary client-side guard: even if the query leaks, strip foreign records
      const data = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(r => isAdmin || r.uid === userData.uid);   // ← double-check

      setReports(data);
      applyFilters(data, dateRange, searchTerm);
    } catch {
      toast.error('Failed to load reports');
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = (data, range, search) => {
    let filtered = [...data];

    if (range.startDate && range.endDate) {
      filtered = filtered.filter(
        r => r.reportDate >= range.startDate && r.reportDate <= range.endDate
      );
    }

    if (search) {
      filtered = filtered.filter(r =>
        r.task?.toLowerCase().includes(search.toLowerCase()) ||
        r.fullname?.toLowerCase().includes(search.toLowerCase())
      );
    }

    setFilteredReports(filtered);
    setCurrentPage(1);
  };

  useEffect(() => {
    if (userData) {
      fetchSettings();
      fetchReports();
    }
  }, [userData]);

  useEffect(() => {
    applyFilters(reports, dateRange, searchTerm);
  }, [dateRange, searchTerm]);

  // ── Calendar builder ──────────────────────────────────────────────────────────
  const getCalendarData = () => {
    const holidaySet = getHolidaySet();
    const start = parseISO(dateRange.startDate);
    const end   = parseISO(dateRange.endDate);
    const days  = eachDayOfInterval({ start, end });

    const dayMap = {};
    days.forEach(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      dayMap[dateStr] = {
        date:       dateStr,
        dayNum:     format(day, 'd'),
        month:      format(day, 'MMMM'),
        dayName:    format(day, 'EEEE'),
        isWeekend:  isWeekend(day),
        isHoliday:  holidaySet.has(dateStr),
        tasks:      {},
        totalCount: 0,
      };
    });

    filteredReports.forEach(report => {
      const day = dayMap[report.reportDate];
      if (!day || day.isHoliday) return;
      if (!day.tasks[report.task]) day.tasks[report.task] = 0;
      day.tasks[report.task] += Number(report.count);
      day.totalCount += Number(report.count);
    });

    return Object.values(dayMap).sort((a, b) => a.date.localeCompare(b.date));
  };

  const calendarData = getCalendarData();

  const getStatus = (day) => {
    if (day.isWeekend)  return day.dayName === 'Saturday' ? 'SATURDAY' : 'SUNDAY';
    if (day.isHoliday)  return 'HOLIDAY';
    if (day.totalCount === 0) return 'ABSENT';
    return 'TASK ACCOMPLISHED';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'TASK ACCOMPLISHED': return 'bg-green-100 text-green-800';
      case 'ABSENT':            return 'bg-red-100 text-red-800';
      case 'SATURDAY':
      case 'SUNDAY':            return 'bg-blue-100 text-blue-800';
      case 'HOLIDAY':           return 'bg-purple-100 text-purple-800';
      default:                  return 'bg-gray-100 text-gray-800';
    }
  };

  // ── Generate PDF — only from the current user's own filtered reports ──────────
  const handleGeneratePDF = () => {
    if (filteredReports.length === 0) {
      toast.error('No reports to generate PDF');
      return;
    }

    // Final safety filter before PDF generation
    const ownReports = isAdmin
      ? filteredReports
      : filteredReports.filter(r => r.uid === userData.uid);

    if (ownReports.length === 0) {
      toast.error('No reports found for your account');
      return;
    }

    generateAccomplishmentPDF(ownReports, userData, dateRange, settings || {});
    toast.success('PDF generated successfully!');
  };

  const totalPages    = Math.ceil(calendarData.length / itemsPerPage);
  const paginatedData = calendarData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-6">

      {/* Ownership notice for employees */}
      {!isAdmin && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="text-blue-500 mt-0.5 flex-shrink-0" size={18} />
          <p className="text-sm text-blue-800">
            You are viewing <strong>your own reports only</strong>. PDF generation will include only your accomplishments.
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-col lg:flex-row gap-4 items-end">
          <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <div className="relative">
                <Calendar size={18} className="absolute left-3 top-2.5 text-gray-400" />
                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <div className="relative">
                <Calendar size={18} className="absolute left-3 top-2.5 text-gray-400" />
                <input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <div className="relative">
                <Search size={18} className="absolute left-3 top-2.5 text-gray-400" />
                <input
                  type="text"
                  placeholder={isAdmin ? 'Search tasks or employees...' : 'Search your tasks...'}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button onClick={fetchReports} variant="outline">
              <Filter size={18} className="mr-2" />
              Show
            </Button>
            <Button onClick={handleGeneratePDF}>
              <Download size={18} className="mr-2" />
              Generate PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Day</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase w-full">Tasks Accomplished</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto" />
                  </td>
                </tr>
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center text-gray-500">
                    <AlertCircle size={40} className="mx-auto mb-2 text-gray-300" />
                    <p>No data found for the selected period</p>
                  </td>
                </tr>
              ) : (
                paginatedData.map((day) => {
                  const status      = getStatus(day);
                  const taskEntries = Object.entries(day.tasks);
                  return (
                    <tr key={day.date} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        {format(parseISO(day.date), 'MMM dd')}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{day.dayName}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(status)}`}>
                          {status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {status === 'SATURDAY' || status === 'SUNDAY' || status === 'HOLIDAY' || status === 'ABSENT' ? (
                          <span className="text-gray-400 italic">—</span>
                        ) : (
                          <ul className="space-y-1">
                            {taskEntries.map(([task, count], i) => (
                              <li key={i} className="flex items-start gap-2">
                                <span className="text-primary-500 mt-1">•</span>
                                <span>{count} {task}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to{' '}
              {Math.min(currentPage * itemsPerPage, calendarData.length)} of {calendarData.length} days
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="px-4 py-2 text-sm font-medium text-gray-700">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DailyReports;