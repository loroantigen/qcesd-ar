import { useState, useEffect } from 'react';
import { collection, addDoc, deleteDoc, doc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useStore } from '../store/useStore';
import { Plus, Trash2, FileText, ListChecks } from 'lucide-react';
import Button from '../components/ui/Button';
import toast from 'react-hot-toast';

const AccomplishedReport = () => {
  const { userData } = useStore();
  const [taskTemplates, setTaskTemplates] = useState([]);
  const [newTask, setNewTask] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // ── Real-time listener: only fetch THIS user's task templates ────────────────
  useEffect(() => {
    if (!userData?.uid) return;

    const templatesRef = collection(db, 'users', userData.uid, 'taskTemplates');
    const q = query(templatesRef, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setTaskTemplates(data);
      setIsLoading(false);
    }, () => {
      toast.error('Failed to load task templates');
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [userData?.uid]);

  const handleAddTask = async () => {
    if (!newTask.trim()) {
      toast.error('Please enter a task description');
      return;
    }
    if (!userData?.uid) return;

    try {
      await addDoc(collection(db, 'users', userData.uid, 'taskTemplates'), {
        text: newTask.trim(),
        createdAt: new Date().toISOString(),
      });
      setNewTask('');
      toast.success('Task template added');
    } catch {
      toast.error('Failed to add task template');
    }
  };

  const handleRemoveTask = async (taskId) => {
    if (!userData?.uid) return;
    try {
      await deleteDoc(doc(db, 'users', userData.uid, 'taskTemplates', taskId));
      toast.success('Task removed');
    } catch {
      toast.error('Failed to remove task');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTask();
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-primary-100 rounded-lg">
            <ListChecks size={24} className="text-primary-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">Accomplished Report Templates</h2>
            <p className="text-sm text-gray-500">
              Define your recurring tasks here. These will appear in your daily reports.
            </p>
          </div>
        </div>

        <div className="flex gap-3 mb-6">
          <input
            type="text"
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter task description (e.g., Conducted code reviews in laravel 9)"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
          <Button onClick={handleAddTask}>
            <Plus size={20} className="mr-2" />
            Add Task
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
          </div>
        ) : taskTemplates.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <FileText size={48} className="mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500">No task templates yet</p>
            <p className="text-sm text-gray-400 mt-1">Add your recurring tasks above</p>
          </div>
        ) : (
          <div className="space-y-2">
            {taskTemplates.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-primary-500 rounded-full"></div>
                  <span className="text-gray-800">{task.text}</span>
                </div>
                <button
                  onClick={() => handleRemoveTask(task.id)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-sm text-blue-800">
          <strong>How it works:</strong> Tasks added here are{' '}
          <strong>private to your account</strong> and will automatically appear in your{' '}
          <strong>Insert Daily Report</strong> page. Just enter the count for each task per day.
          The system will merge counts across the date range and generate your PDF.
        </p>
      </div>
    </div>
  );
};

export default AccomplishedReport;