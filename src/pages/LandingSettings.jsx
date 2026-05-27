import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useStore } from '../store/useStore'; // Assuming you use useStore for global user state
import { Settings, Save, Building, CalendarDays, Plus, Trash2, Lock } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import toast from 'react-hot-toast';

const LandingSettings = () => {
  const { userData, setUserData } = useStore(); // Get current logged-in user context
  
  const [settings, setSettings] = useState({
    departmentName: '',
    address: '',
    contact: '',
  });

  const [userSpecific, setUserSpecific] = useState({
    signatories: {
      supervisor: { name: '', title: '', division: '' },
      head:       { name: '', title: '' },
    },
    holidays: [], // Custom isolated user holidays
  });

  const [newHoliday, setNewHoliday] = useState({ date: '', name: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving,  setIsSaving]  = useState(false);

  const isAdmin = userData?.role === 'admin';

  useEffect(() => {
    if (!userData?.uid) return;

    const fetchAllSettings = async () => {
      setIsLoading(true);
      try {
        // 1. Fetch Shared Department Global Settings
        const globalSnap = await getDoc(doc(db, 'settings', 'general'));
        if (globalSnap.exists()) {
          const globalData = globalSnap.data();
          setSettings({
            departmentName: globalData.departmentName || '',
            address: globalData.address || '',
            contact: globalData.contact || '',
          });
        }

        // 2. Fetch User-Specific Isolated Signatories & Holidays
        const userSnap = await getDoc(doc(db, 'users', userData.uid));
        if (userSnap.exists()) {
          const uData = userSnap.data();
          setUserSpecific({
            signatories: {
              supervisor: { name: '', title: '', division: '', ...(uData.signatories?.supervisor || {}) },
              head:       { name: '', title: '',               ...(uData.signatories?.head       || {}) },
            },
            holidays: uData.holidays || [],
          });
        }
      } catch {
        toast.error('Failed to load configuration settings');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchAllSettings();
  }, [userData?.uid]);

  const handleSave = async () => {
    if (!userData?.uid) return;
    setIsSaving(true);
    
    try {
      // 1. Save Signatories and Holidays to the current user's profile document
      await setDoc(doc(db, 'users', userData.uid), {
        ...userData, // Maintain administrative fields like role, approved status, etc.
        signatories: userSpecific.signatories,
        holidays: userSpecific.holidays,
      }, { merge: true });

      // Synchronize changes to local global client state instantly
      if (setUserData) {
        setUserData({
          ...userData,
          signatories: userSpecific.signatories,
          holidays: userSpecific.holidays
        });
      }

      // 2. Only attempt to save Shared Department Configuration if user is Admin
      if (isAdmin) {
        await setDoc(doc(db, 'settings', 'general'), settings, { merge: true });
      }

      toast.success('Your settings saved successfully');
    } catch (error) {
      console.error(error);
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  // ── Holiday helpers ──────────────────────────────────────────────────────────

  const handleAddHoliday = () => {
    if (!newHoliday.date || !newHoliday.name.trim()) {
      toast.error('Please enter both a date and holiday name');
      return;
    }
    const duplicate = userSpecific.holidays.some(h => h.date === newHoliday.date);
    if (duplicate) {
      toast.error('That date is already listed');
      return;
    }
    const sorted = [...userSpecific.holidays, { ...newHoliday, name: newHoliday.name.trim() }]
      .sort((a, b) => a.date.localeCompare(b.date));
      
    setUserSpecific(prev => ({ ...prev, holidays: sorted }));
    setNewHoliday({ date: '', name: '' });
  };

  const handleRemoveHoliday = (date) => {
    setUserSpecific(prev => ({
      ...prev,
      holidays: prev.holidays.filter(h => h.date !== date),
    }));
  };

  if (isLoading) return (
    <div className="flex justify-center p-12">
      <div className="animate-spin h-8 w-8 border-b-2 border-primary-600 rounded-full" />
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* Department Information */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between border-b pb-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-100 rounded-lg">
              <Settings size={24} className="text-primary-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">My Settings</h2>
              <p className="text-sm text-gray-500">Configure your signature elements, holidays, and regional structures</p>
            </div>
          </div>
          {!isAdmin && (
            <span className="flex items-center gap-1.5 text-xs font-medium text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
              <Lock size={12} /> Read-Only Global Info
            </span>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <Building size={20} className="text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-800">Department Information</h3>
          </div>

          <Input
            label="Department Name"
            value={settings.departmentName}
            disabled={!isAdmin}
            onChange={(e) => setSettings(prev => ({ ...prev, departmentName: e.target.value }))}
            placeholder="e.g., QUEZON CITY HEALTH DEPARTMENT"
          />
          <Input
            label="Address"
            value={settings.address}
            disabled={!isAdmin}
            onChange={(e) => setSettings(prev => ({ ...prev, address: e.target.value }))}
            placeholder="Department address"
          />
          <Input
            label="Contact Information"
            value={settings.contact}
            disabled={!isAdmin}
            onChange={(e) => setSettings(prev => ({ ...prev, contact: e.target.value }))}
            placeholder="Phone / Email"
          />
        </div>
      </div>

      {/* Signatories */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">My Personal Signatories</h3>

        <div className="space-y-4">
          {/* Supervisor */}
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm font-medium text-gray-700 mb-3">Supervisor (Noted by)</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="Name"
                value={userSpecific.signatories.supervisor.name}
                onChange={(e) => setUserSpecific(prev => ({
                  ...prev,
                  signatories: {
                    ...prev.signatories,
                    supervisor: { ...prev.signatories.supervisor, name: e.target.value },
                  },
                }))}
                placeholder="Full name"
              />
              <Input
                label="Title"
                value={userSpecific.signatories.supervisor.title}
                onChange={(e) => setUserSpecific(prev => ({
                  ...prev,
                  signatories: {
                    ...prev.signatories,
                    supervisor: { ...prev.signatories.supervisor, title: e.target.value },
                  },
                }))}
                placeholder="e.g., Officer-In-Charge"
              />
              <Input
                label="Division"
                value={userSpecific.signatories.supervisor.division}
                onChange={(e) => setUserSpecific(prev => ({
                  ...prev,
                  signatories: {
                    ...prev.signatories,
                    supervisor: { ...prev.signatories.supervisor, division: e.target.value },
                  },
                }))}
                placeholder="e.g., Epidemiology and Surveillance Division"
              />
            </div>
          </div>

          {/* Department Head */}
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm font-medium text-gray-700 mb-3">Department Head (Approved by)</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Name"
                value={userSpecific.signatories.head.name}
                onChange={(e) => setUserSpecific(prev => ({
                  ...prev,
                  signatories: {
                    ...prev.signatories,
                    head: { ...prev.signatories.head, name: e.target.value },
                  },
                }))}
                placeholder="Full name"
              />
              <Input
                label="Title"
                value={userSpecific.signatories.head.title}
                onChange={(e) => setUserSpecific(prev => ({
                  ...prev,
                  signatories: {
                    ...prev.signatories,
                    head: { ...prev.signatories.head, title: e.target.value },
                  },
                }))}
                placeholder="e.g., Regional Director"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Holidays */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2 bg-purple-100 rounded-lg">
            <CalendarDays size={22} className="text-purple-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-800">My Custom Holidays</h3>
            <p className="text-sm text-gray-500">
              These dates are personal to your profile tracking parameters and won't impact other users.
            </p>
          </div>
        </div>

        {/* Add holiday row */}
        <div className="flex gap-3 mb-4">
          <input
            type="date"
            value={newHoliday.date}
            onChange={(e) => setNewHoliday(prev => ({ ...prev, date: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
          />
          <input
            type="text"
            placeholder="Holiday name (e.g., Local Barangay Holiday)"
            value={newHoliday.name}
            onChange={(e) => setNewHoliday(prev => ({ ...prev, name: e.target.value }))}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddHoliday(); } }}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
          />
          <Button onClick={handleAddHoliday} size="sm">
            <Plus size={16} className="mr-1" />
            Add
          </Button>
        </div>

        {/* Holiday list */}
        {userSpecific.holidays.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg text-gray-400 text-sm">
            No personal holidays configured. Add dates above.
          </div>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {userSpecific.holidays.map(h => (
              <div
                key={h.date}
                className="flex items-center justify-between px-4 py-2.5 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                    {format(parseISO(h.date), 'MMM dd, yyyy')}
                  </span>
                  <span className="text-sm text-gray-800">{h.name}</span>
                </div>
                <button
                  onClick={() => handleRemoveHoliday(h.date)}
                  className="p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Save */}
      <div className="flex justify-end">
        <Button onClick={handleSave} isLoading={isSaving}>
          <Save size={20} className="mr-2" />
          Save Settings
        </Button>
      </div>

    </div>
  );
};

export default LandingSettings;