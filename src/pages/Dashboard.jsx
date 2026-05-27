import { useEffect, useState, useRef } from 'react';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useStore } from '../store/useStore';
import { FileText, CheckCircle, Clock, Calendar, AlertCircle } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

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

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!userData?.uid) {
        setIsLoading(false);
        return;
      }
      
      setIndexError(false);
      
      try {
        const isAdmin = userData.role === 'admin';
        const reportsRef = collection(db, 'dailyreports');
        
        let q;
        try {
          // Try indexed query first
          q = isAdmin 
            ? query(reportsRef, orderBy('createdAt', 'desc'), limit(5))
            : query(reportsRef, where('uid', '==', userData.uid), orderBy('createdAt', 'desc'), limit(5));
          
          const snapshot = await getDocs(q);
          const reports = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setRecentReports(reports);
        } catch (err) {
          if (err.message?.includes('index')) {
            setIndexError(true);
            // Fallback: simple query without orderBy
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

        // Get all reports for stats (fallback without orderBy)
        const allReportsQuery = isAdmin 
          ? query(reportsRef)
          : query(reportsRef, where('uid', '==', userData.uid));
        
        const allSnapshot = await getDocs(allReportsQuery);
        const allReports = allSnapshot.docs.map(doc => doc.data());
        
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

    fetchDashboardData();
  }, [userData]);

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

  if (isLoading) {
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

      <div className="bg-navy-800 rounded-xl p-6 text-white">
        <h2 className="text-2xl font-bold">Welcome back, {userData?.fullname || 'User'}!</h2>
        <p className="text-navy-300 mt-1">
          {userData?.role === 'admin' 
            ? 'You have admin access. Manage users and view all reports.' 
            : 'Track your daily accomplishments and generate reports.'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Reports" value={stats.totalReports} icon={FileText} color="bg-blue-500" subtitle="All time" />
        <StatCard title="This Month" value={stats.thisMonth} icon={Calendar} color="bg-green-500" subtitle={format(new Date(), 'MMMM yyyy')} />
        <StatCard title="Pending" value={stats.pendingTasks} icon={Clock} color="bg-yellow-500" subtitle="Awaiting review" />
        <StatCard title="Approved" value={stats.approvedCount} icon={CheckCircle} color="bg-purple-500" subtitle="Completed" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart with explicit min-height to fix recharts warning */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Monthly Report Activity</h3>
          <div className="h-80 min-h-[320px]" ref={chartRef}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="reports" fill="#2563eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
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
    </div>
  );
};

export default Dashboard;