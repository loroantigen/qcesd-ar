import { useState, useEffect } from 'react';
import { collection, doc, getDocs, query, orderBy, where, writeBatch } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useStore } from '../store/useStore';
import { Save, FileText, Calendar, AlertCircle } from 'lucide-react';
import Button from '../components/ui/Button';
import toast from 'react-hot-toast';

const InsertDailyReport = () => {
  const { userData } = useStore();
  const [taskTemplates, setTaskTemplates] = useState([]);
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [counts, setCounts] = useState({});
  
  // ── Track existing document IDs to handle updates and decreases/deletes ──────
  const [existingDocIds, setExistingDocIds] = useState({}); 
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);

  // ── Fetch only THIS user's task templates from Firestore ─────────────────────
  useEffect(() => {
    if (!userData?.uid) return;

    const fetchTemplates = async () => {
      setIsLoadingTemplates(true);
      try {
        const templatesRef = collection(db, 'users', userData.uid, 'taskTemplates');
        const q = query(templatesRef, orderBy('createdAt', 'asc'));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        setTaskTemplates(data);

        // Initialize counts to 0
        const initialCounts = {};
        data.forEach(task => { initialCounts[task.id] = 0; });
        setCounts(initialCounts);
      } catch {
        toast.error('Failed to load task templates');
      } finally {
        setIsLoadingTemplates(false);
      }
    };

    fetchTemplates();
  }, [userData?.uid]);

  // ── Sync counts from existing reports when the date changes ────────────────
  useEffect(() => {
    if (!userData?.uid || taskTemplates.length === 0) return;

    const fetchExistingReports = async () => {
      try {
        const reportsRef = collection(db, 'dailyreports');
        const q = query(
          reportsRef,
          where('uid', '==', userData.uid),
          where('reportDate', '==', reportDate)
        );
        const snapshot = await getDocs(q);

        // Prepare default structural maps
        const syncedCounts = {};
        const docMapping = {};
        taskTemplates.forEach(task => { syncedCounts[task.id] = 0; });

        // Overlay existing Firestore data if it exists
        snapshot.docs.forEach(docSnap => {
          const data = docSnap.data();
          const matchingTemplate = taskTemplates.find(t => t.text === data.task);
          if (matchingTemplate) {
            syncedCounts[matchingTemplate.id] = data.count;
            docMapping[matchingTemplate.id] = docSnap.id; // Map your template ID to Firestore doc ID
          }
        });

        setCounts(syncedCounts);
        setExistingDocIds(docMapping);
      } catch (error) {
        console.error('Error fetching historical data:', error);
        toast.error('Failed to load existing records for this date');
      }
    };

    fetchExistingReports();
  }, [reportDate, taskTemplates, userData?.uid]);

  const handleCountChange = (taskId, value) => {
    const num = parseInt(value) || 0;
    if (num < 0) return;
    setCounts(prev => ({ ...prev, [taskId]: num }));
  };

  const handleSubmit = async () => {
    if (!userData?.uid) {
      toast.error('User not authenticated');
      return;
    }

    setIsSubmitting(true);
    try {
      // Using writeBatch handles creates, updates, and deletes atomicaly
      const batch = writeBatch(db);
      const currentDocIds = { ...existingDocIds };

      taskTemplates.forEach((task) => {
        const count = counts[task.id] || 0;
        const existingDocId = existingDocIds[task.id];

        if (count > 0) {
          // Point to the existing doc if it exists, otherwise generate a clean doc reference
          const docRef = existingDocId 
            ? doc(db, 'dailyreports', existingDocId) 
            : doc(collection(db, 'dailyreports'));

          batch.set(docRef, {
            uid:        userData.uid,
            fullname:   userData.fullname,
            position:   userData.position || 'Employee',
            reportDate: reportDate,
            task:       task.text,
            count:      count,
            status:     'pending',
            createdAt:  new Date().toISOString(),
          }, { merge: true });

          // Retain tracking of newly initialized document reference IDs
          if (!existingDocId) {
            currentDocIds[task.id] = docRef.id;
          }
        } else if (existingDocId && count === 0) {
          // If the record exists but was decreased to 0, completely purge it
          const docRef = doc(db, 'dailyreports', existingDocId);
          batch.delete(docRef);
          delete currentDocIds[task.id];
        }
      });

      await batch.commit();
      setExistingDocIds(currentDocIds);
      toast.success('Daily report updated successfully!');
    } catch (error) {
      console.error('Error submitting report:', error);
      toast.error('Failed to submit report');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClear = () => {
    const resetCounts = {};
    taskTemplates.forEach(task => { resetCounts[task.id] = 0; });
    setCounts(resetCounts);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-primary-100 rounded-lg">
            <FileText size={24} className="text-primary-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">Insert Daily Report</h2>
            <p className="text-sm text-gray-500">Enter counts for your tasks</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Report Date</label>
            <div className="relative">
              <Calendar size={18} className="absolute left-3 top-2.5 text-gray-400" />
              <input
                type="date"
                value={reportDate}
                onChange={(e) => setReportDate(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>

          <div className="flex items-end">
            <div className="text-sm text-gray-600 bg-gray-50 px-4 py-2 rounded-lg w-full">
              <strong>Employee:</strong> {userData?.fullname}<br />
              <strong>Position:</strong> {userData?.position || 'N/A'}
            </div>
          </div>
        </div>

        {isLoadingTemplates ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
          </div>
        ) : taskTemplates.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg mb-6">
            <AlertCircle size={48} className="mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500">No task templates found</p>
            <p className="text-sm text-gray-400 mt-1">
              Go to <strong>Accomplished Report</strong> to add your recurring tasks first
            </p>
          </div>
        ) : (
          <div className="space-y-3 mb-6">
            {taskTemplates.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div className="flex-1 pr-4">
                  <p className="text-sm font-medium text-gray-800">{task.text}</p>
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-sm text-gray-500">Count:</label>
                  <input
                    type="number"
                    min="0"
                    value={counts[task.id] || 0}
                    onChange={(e) => handleCountChange(task.id, e.target.value)}
                    className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-center focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
          <Button type="button" variant="outline" onClick={handleClear}>
            Clear
          </Button>
          <Button
            onClick={handleSubmit}
            isLoading={isSubmitting}
            disabled={taskTemplates.length === 0}
          >
            <Save size={20} className="mr-2" />
            Submit Report
          </Button>
        </div>
      </div>
    </div>
  );
};

export default InsertDailyReport;