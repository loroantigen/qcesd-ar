import { useState, useEffect } from 'react';
import { collection, query, getDocs, doc, updateDoc, deleteDoc, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';
import { 
  Users, CheckCircle, XCircle, Trash2, Search, Shield,
  UserCheck, UserX, Filter
} from 'lucide-react';
import Button from '../components/ui/Button';
import toast from 'react-hot-toast';

const AdminPanel = () => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isLoading, setIsLoading] = useState(true);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(data);
      setFilteredUsers(data);
    } catch (error) {
      toast.error('Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    let filtered = [...users];
    
    if (searchTerm) {
      filtered = filtered.filter(u => 
        u.fullname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (filterStatus !== 'all') {
      filtered = filtered.filter(u => {
        if (filterStatus === 'approved') return u.approved === true;
        if (filterStatus === 'pending') return u.approved === false;
        if (filterStatus === 'admin') return u.role === 'admin';
        if (filterStatus === 'employee') return u.role === 'employee';
        return true;
      });
    }
    
    setFilteredUsers(filtered);
  }, [searchTerm, filterStatus, users]);

  const handleApprove = async (userId) => {
    try {
      await updateDoc(doc(db, 'users', userId), { approved: true });
      toast.success('User approved successfully');
      fetchUsers();
    } catch (error) {
      toast.error('Failed to approve user');
    }
  };

  const handleReject = async (userId) => {
    try {
      await updateDoc(doc(db, 'users', userId), { approved: false });
      toast.success('User rejected');
      fetchUsers();
    } catch (error) {
      toast.error('Failed to reject user');
    }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    
    try {
      await deleteDoc(doc(db, 'users', userId));
      toast.success('User deleted successfully');
      fetchUsers();
    } catch (error) {
      toast.error('Failed to delete user');
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await updateDoc(doc(db, 'users', userId), { role: newRole });
      toast.success(`Role updated to ${newRole}`);
      fetchUsers();
    } catch (error) {
      toast.error('Failed to update role');
    }
  };

  const stats = {
    total: users.length,
    approved: users.filter(u => u.approved).length,
    pending: users.filter(u => !u.approved).length,
    admins: users.filter(u => u.role === 'admin').length,
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Users</p>
              <h3 className="text-2xl font-bold text-gray-800">{stats.total}</h3>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Users size={24} className="text-blue-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Approved</p>
              <h3 className="text-2xl font-bold text-gray-800">{stats.approved}</h3>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <UserCheck size={24} className="text-green-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Pending</p>
              <h3 className="text-2xl font-bold text-gray-800">{stats.pending}</h3>
            </div>
            <div className="p-3 bg-yellow-100 rounded-lg">
              <UserX size={24} className="text-yellow-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Admins</p>
              <h3 className="text-2xl font-bold text-gray-800">{stats.admins}</h3>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <Shield size={24} className="text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-3 top-2.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          
          <div className="flex gap-3">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="all">All Status</option>
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
              <option value="admin">Admins</option>
              <option value="employee">Employees</option>
            </select>
            
            <Button onClick={fetchUsers} variant="outline">
              <Filter size={18} className="mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">User</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Position</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Role</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Joined</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center">
                    No users found
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                          <span className="text-primary-600 font-bold">
                            {user.fullname?.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{user.fullname}</p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{user.position || 'N/A'}</td>
                    <td className="px-6 py-4">
                      <select
                        value={user.role || 'employee'}
                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                        className="text-sm border border-gray-300 rounded-lg px-2 py-1 focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="employee">Employee</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.approved 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {user.approved ? 'Approved' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {!user.approved ? (
                          <button
                            onClick={() => handleApprove(user.id)}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Approve"
                          >
                            <CheckCircle size={18} />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleReject(user.id)}
                            className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                            title="Reject"
                          >
                            <XCircle size={18} />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(user.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;