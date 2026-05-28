import { useEffect, useState, useRef } from 'react';
import { collection, query, where, getDocs, getDoc, orderBy, limit, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useStore } from '../store/useStore';
import { 
  FileText, CheckCircle, Clock, Calendar, AlertCircle, 
  Printer, ToggleLeft, Users, Search, Info 
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, parseISO, isWeekend, eachDayOfInterval, isAfter, startOfDay } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { generateAccomplishmentPDF } from '../utils/pdfGenerator';
import toast from 'react-hot-toast';

const Dashboard = () => {
  const { userData } = useStore();
  const [stats, setStats] = useState({
    totalReports: 0,
    thisMonth: 0,
    pendingTasks: 0,
    approvedCount: 0,
  });
  const [recentReports, setRecentReports] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [indexError, setIndexError] = useState(false);
  const chartRef = useRef(null);

  const [allUserReports, setAllUserReports] = useState([]);
  const [rangeStats, setRangeStats] = useState({ absent: 0, holiday: 0 });

  // ── Print readiness ──
  const [myPrintStatus, setMyPrintStatus] = useState({
    ready: false,
    dateRange: { startDate: '', endDate: '' },
    updatedAt: null
  });
  const [savingStatus, setSavingStatus] = useState(false);
  const [expiredNotice, setExpiredNotice] = useState(false);

  // ── Moderator board ──
  const [allEmployees, setAllEmployees] = useState([]);
  const [moderatorSearch, setModeratorSearch] = useState('');
  const [globalSettings, setGlobalSettings] = useState({
    departmentName: '', address: '', contact: ''
  });
  const [generatingFor, setGeneratingFor] = useState(null);

  const isAdmin = userData?.role === 'admin';
  const isModerator = userData?.role === 'moderator';
  const isEmployee = !isAdmin && !isModerator;

  const fetchGlobalConfig = async () => {
    try {
      const docSnap = await getDoc(doc(db, 'settings', 'general'));
      if (docSnap.exists()) {
        const data = docSnap.data();
        setGlobalSettings({
          departmentName: data.departmentName || '',
          address: data.address || '',
          contact: data.contact || '',
        });
      }
    } catch (error) {
      console.error('Error loading shared config:', error);
    }
  };

  const fetchDashboardData = async () => {
    if (!userData?.uid) {
      setIsLoading(false);
      return;
    }
    setIndexError(false);
    try {
      const reportsRef = collection(db, 'dailyreports');
      let q;
      try {
        q = isAdmin
          ? query(reportsRef, orderBy('createdAt', 'desc'), limit(5))
          : query(reportsRef, where('uid', '==', userData.uid), orderBy('createdAt', 'desc'), limit(5));
        const snapshot = await getDocs(q);
        const reports = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setRecentReports(reports);
      } catch (err) {
        if (err.message?.includes('index')) {
          setIndexError(true);
          q = isAdmin
            ? query(reportsRef, limit(5))
            : query(reportsRef, where('uid', '==', userData.uid), limit(5));
          const snapshot = await getDocs(q);
          const reports = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setRecentReports(reports);
        } else {
          throw err;
        }
      }

      const allReportsQuery = isAdmin
        ? query(reportsRef)
        : query(reportsRef, where('uid', '==', userData.uid));
      const allSnapshot = await getDocs(allReportsQuery);
      const allReports = allSnapshot.docs.map(doc => doc.data());
      setAllUserReports(allReports);

      const now = new Date();
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);
      const thisMonthReports = allReports.filter(r => {
        const date = new Date(r.reportDate);
        return date >= monthStart && date <= monthEnd;
      });

      setStats({
        totalReports: allReports.length,
        thisMonth: thisMonthReports.length,
        pendingTasks: allReports.filter(r => !r.status || r.status === 'pending').length,
        approvedCount: allReports.filter(r => r.status === 'approved').length,
      });

      const months = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthStr = format(d, 'MMM yyyy');
        const count = allReports.filter(r => {
          const rDate = new Date(r.reportDate);
          return rDate.getMonth() === d.getMonth() && rDate.getFullYear() === d.getFullYear();
        }).length;
        months.push({ name: monthStr, reports: count });
      }
      setMonthlyData(months);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchModeratorData = async () => {
    setIsLoading(true);
    try {
      const snap = await getDocs(collection(db, 'users'));
      const users = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const employees = users.filter(u => u.role === 'employee' || !u.role);
      setAllEmployees(employees);
    } catch (error) {
      toast.error('Failed to load employee list');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Initialize print status from profile ──
  useEffect(() => {
    if (!userData?.uid) return;

    let status = userData.printStatus || {
      ready: false,
      dateRange: {
        startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
        endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd')
      },
      updatedAt: null
    };

    // ── AUTO-EXPIRE: flip to Not Ready when we enter a new month after the period ends ──
    if (status.ready && status.dateRange?.endDate) {
      const end = parseISO(status.dateRange.endDate);
      const now = new Date();

      const endYear  = end.getFullYear();
      const endMonth = end.getMonth();
      const nowYear  = now.getFullYear();
      const nowMonth = now.getMonth();

      // If current month/year is different from the endDate's month/year → expired
      if (nowYear !== endYear || nowMonth !== endMonth) {
        status = { ...status, ready: false, updatedAt: new Date().toISOString() };
        setExpiredNotice(true);
        // Silent Firestore update so it stays in sync
        updateDoc(doc(db, 'users', userData.uid), { printStatus: status }).catch(() => {});
      }
    }

    setMyPrintStatus(status);
  }, [userData?.uid, userData?.printStatus]);

  useEffect(() => {
    if (userData?.uid) {
      fetchGlobalConfig();
      if (isModerator) {
        fetchModeratorData();
      } else {
        fetchDashboardData();
      }
    }
  }, [userData]);

  // ── Calculate ABSENT and HOLIDAY for selected date range ──
  useEffect(() => {
    if (!allUserReports.length || !myPrintStatus.dateRange?.startDate || !myPrintStatus.dateRange?.endDate) {
      setRangeStats({ absent: 0, holiday: 0 });
      return;
    }

    const holidayList = userData?.holidays || [];
    const holidaySet = new Set(holidayList.map(h => (typeof h === 'string' ? h : h.date)));

    const start = parseISO(myPrintStatus.dateRange.startDate);
    const end = parseISO(myPrintStatus.dateRange.endDate);

    if (start > end) {
      setRangeStats({ absent: 0, holiday: 0 });
      return;
    }

    const days = eachDayOfInterval({ start, end });
    const reportDates = new Set(allUserReports.map(r => r.reportDate));

    let absent = 0;
    let holiday = 0;

    days.forEach(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      if (isWeekend(day)) return;
      if (holidaySet.has(dateStr)) {
        holiday++;
      } else if (!reportDates.has(dateStr)) {
        absent++;
      }
    });

    setRangeStats({ absent, holiday });
  }, [allUserReports, myPrintStatus.dateRange, userData?.holidays]);

  const handleDateRangeChange = (field, value) => {
    setMyPrintStatus(prev => ({
      ...prev,
      ready: false,           // Changing dates automatically invalidates old validation
      dateRange: { ...prev.dateRange, [field]: value }
    }));
  };

  const savePrintStatus = async (newReadyState = null) => {
    if (!userData?.uid) return;
    setSavingStatus(true);
    try {
      const status = {
        ready: newReadyState !== null ? newReadyState : myPrintStatus.ready,
        dateRange: myPrintStatus.dateRange,
        updatedAt: new Date().toISOString()
      };
      await updateDoc(doc(db, 'users', userData.uid), { printStatus: status });
      setMyPrintStatus(status);
      setExpiredNotice(false);
      toast.success(status.ready ? 'Marked as Ready to Print' : 'Marked as Not Ready to Print');
    } catch (error) {
      toast.error('Failed to update status');
    } finally {
      setSavingStatus(false);
    }
  };

  const toggleReady = () => savePrintStatus(!myPrintStatus.ready);

  const handleModeratorPrint = async (employee) => {
    if (!employee.printStatus?.ready) {
      toast.error('Employee has not marked accomplishments as ready');
      return;
    }
    const range = employee.printStatus.dateRange;
    if (!range?.startDate || !range?.endDate) {
      toast.error('Employee has not set a valid date range');
      return;
    }

    setGeneratingFor(employee.id);
    try {
      const q = query(collection(db, 'dailyreports'), where('uid', '==', employee.id));
      const snap = await getDocs(q);
      const reports = snap.docs
        .map(d => d.data())
        .filter(r => r.reportDate >= range.startDate && r.reportDate <= range.endDate);

      if (reports.length === 0) {
        toast.error('No reports found for the selected period');
        return;
      }

      const compiledSettings = {
        departmentName: globalSettings.departmentName,
        address: globalSettings.address,
        contact: globalSettings.contact,
        signatories: employee.signatories || {
          supervisor: { name: '', title: '', division: '' },
          head: { name: '', title: '' },
        },
        holidays: employee.holidays || []
      };

      generateAccomplishmentPDF(reports, employee, range, compiledSettings);
      toast.success(`PDF generated for ${employee.fullname || 'Employee'}`);
    } catch (error) {
      console.error(error);
      toast.error('Failed to generate PDF');
    } finally {
      setGeneratingFor(null);
    }
  };

  const filteredEmployees = allEmployees.filter(emp => {
    if (!moderatorSearch) return true;
    const term = moderatorSearch.toLowerCase();
    return (emp.fullname?.toLowerCase().includes(term) || emp.email?.toLowerCase().includes(term));
  });

  const StatCard = ({ title, value, icon: Icon, color, subtitle }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <h3 className="text-2xl font-bold text-gray-800 mt-2">{value}</h3>
          {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon size={24} className="text-white" />
        </div>
      </div>
    </div>
  );

  const renderEmployeeView = () => {
    const rangeLabel = myPrintStatus.dateRange?.startDate && myPrintStatus.dateRange?.endDate
      ? `${format(parseISO(myPrintStatus.dateRange.startDate), 'MMM dd')} - ${format(parseISO(myPrintStatus.dateRange.endDate), 'MMM dd, yyyy')}`
      : 'No range selected';

    return (
      <>
        <div className="bg-navy-800 rounded-xl p-6 text-white">
          <h2 className="text-2xl font-bold">Welcome back, {userData?.fullname || 'User'}!</h2>
          <p className="text-navy-300 mt-1">
            {isAdmin
              ? 'You have admin access. Manage users and view all reports.'
              : 'Track your daily accomplishments and generate reports.'}
          </p>
        </div>

        {/* Expired notice banner */}
        {expiredNotice && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-start gap-3">
            <Info className="text-orange-600 mt-0.5 flex-shrink-0" size={20} />
            <div>
              <p className="text-sm font-medium text-orange-800">Validation Expired</p>
              <p className="text-xs text-orange-600 mt-1">
                Your previous validation period has ended. Please review your reports and validate again when ready.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard title="Total Reports" value={stats.totalReports} icon={FileText} color="bg-blue-500" subtitle="All time" />
          <StatCard title="This Month" value={stats.thisMonth} icon={Calendar} color="bg-green-500" subtitle={format(new Date(), 'MMMM yyyy')} />
          <StatCard title="Absent" value={rangeStats.absent} icon={Clock} color="bg-red-500" subtitle={rangeLabel} />
          <StatCard title="Holidays" value={rangeStats.holiday} icon={Calendar} color="bg-purple-500" subtitle="In selected range" />
        </div>

        {/* Print Readiness Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <Printer size={20} className="text-primary-600" />
              Print Readiness
            </h3>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${myPrintStatus.ready ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
              {myPrintStatus.ready ? 'Ready to Print' : 'Not Ready'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={myPrintStatus.dateRange?.startDate || ''}
                onChange={(e) => handleDateRangeChange('startDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={myPrintStatus.dateRange?.endDate || ''}
                onChange={(e) => handleDateRangeChange('endDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
            <div>
              <p className="text-sm font-medium text-gray-800">Validation Status</p>
              <p className="text-xs text-gray-500">
                {myPrintStatus.ready
                  ? 'Your accomplishments are validated and ready for printing.'
                  : 'Validate your accomplishments when they are ready to print.'}
              </p>
            </div>
            <button
              onClick={toggleReady}
              disabled={savingStatus}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${myPrintStatus.ready ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'} disabled:opacity-50`}
            >
              {savingStatus ? (
                <div className="animate-spin h-4 w-4 border-2 border-white rounded-full" />
              ) : myPrintStatus.ready ? (
                <><CheckCircle size={16} /> Validated</>
              ) : (
                <><ToggleLeft size={16} /> Validate Now</>
              )}
            </button>
          </div>

          {myPrintStatus.updatedAt && (
            <p className="text-xs text-gray-400 mt-3 text-right">
              Last updated: {format(new Date(myPrintStatus.updatedAt), 'MMM dd, yyyy h:mm a')}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Monthly Report Activity</h3>
            <div className="h-80 min-h-[320px]" ref={chartRef}>
              {chartRef.current && (
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="reports" fill="#2563eb" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Reports</h3>
            <div className="space-y-4">
              {recentReports.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <AlertCircle size={40} className="mx-auto mb-2" />
                  <p>No reports yet</p>
                </div>
              ) : (
                recentReports.map((report) => (
                  <div key={report.id} className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                    <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <FileText size={18} className="text-primary-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{report.task}</p>
                      <p className="text-xs text-gray-500">
                        {format(new Date(report.reportDate), 'MMM dd, yyyy')} • Count: {report.count}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </>
    );
  };

  const renderModeratorView = () => (
    <div className="space-y-6">
      <div className="bg-indigo-900 rounded-xl p-6 text-white">
        <h2 className="text-2xl font-bold">Moderator Dashboard</h2>
        <p className="text-indigo-200 mt-1">Review employee print readiness and generate accomplishment reports.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Employees</p>
              <h3 className="text-2xl font-bold text-gray-800">{allEmployees.length}</h3>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg"><Users size={24} className="text-blue-600" /></div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Ready to Print</p>
              <h3 className="text-2xl font-bold text-gray-800">
                {allEmployees.filter(e => e.printStatus?.ready).length}
              </h3>
            </div>
            <div className="p-3 bg-green-100 rounded-lg"><CheckCircle size={24} className="text-green-600" /></div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Not Ready</p>
              <h3 className="text-2xl font-bold text-gray-800">
                {allEmployees.filter(e => !e.printStatus?.ready).length}
              </h3>
            </div>
            <div className="p-3 bg-gray-100 rounded-lg"><Clock size={24} className="text-gray-600" /></div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-col md:flex-row gap-4 items-end mb-6">
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-3 top-2.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search employees..."
              value={moderatorSearch}
              onChange={(e) => setModeratorSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <button
            onClick={fetchModeratorData}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium"
          >
            Refresh
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Employee</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Position</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Date Range</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Last Updated</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto" />
                  </td>
                </tr>
              ) : filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-500">No employees found</td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => {
                  const range = emp.printStatus?.dateRange;
                  return (
                    <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                            <span className="text-primary-600 font-bold">{emp.fullname?.charAt(0).toUpperCase()}</span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{emp.fullname || 'Unnamed'}</p>
                            <p className="text-xs text-gray-500">{emp.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{emp.position || 'N/A'}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {range?.startDate && range?.endDate ? (
                          <span>{format(parseISO(range.startDate), 'MMM dd')} - {format(parseISO(range.endDate), 'MMM dd, yyyy')}</span>
                        ) : (
                          <span className="text-gray-400 italic">Not set</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${emp.printStatus?.ready ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                          {emp.printStatus?.ready ? 'Ready' : 'Not Ready'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {emp.printStatus?.updatedAt
                          ? format(new Date(emp.printStatus.updatedAt), 'MMM dd, yyyy h:mm a')
                          : '—'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleModeratorPrint(emp)}
                          disabled={generatingFor === emp.id || !emp.printStatus?.ready}
                          className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {generatingFor === emp.id ? (
                            <div className="animate-spin h-4 w-4 border-2 border-white rounded-full" />
                          ) : (
                            <Printer size={16} />
                          )}
                          Print PDF
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  if (isLoading && !isModerator) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {indexError && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="text-yellow-600 mt-0.5" size={20} />
          <div>
            <p className="text-sm font-medium text-yellow-800">Database Index Required</p>
            <p className="text-xs text-yellow-600 mt-1">
              Please create the Firestore index (check browser console for the link). The app is using fallback mode until then.
            </p>
          </div>
        </div>
      )}

      {isModerator ? renderModeratorView() : renderEmployeeView()}
    </div>
  );
};

export default Dashboard;