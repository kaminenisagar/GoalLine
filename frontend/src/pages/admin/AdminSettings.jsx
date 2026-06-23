import { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  Settings, Lock, User, Shield, Save, ToggleLeft, ToggleRight,
  AlertTriangle, CheckCircle, Eye, EyeOff, Briefcase, Users,
  MessageSquare, Clock, CreditCard, FileText, Activity, BookOpen
} from 'lucide-react';

const FREEZE_GROUPS = [
  {
    label: 'Dashboard & Portal Access',
    icon: Shield,
    color: 'blue',
    keys: [
      { key: 'freeze_employee_dashboard', icon: Briefcase, label: 'Employee Dashboard', desc: 'Blocks all employees from accessing their dashboard' },
      { key: 'freeze_client_portal', icon: Users, label: 'Client Portal', desc: 'Blocks all clients from accessing their portal' },
    ]
  },
  {
    label: 'HR & Attendance Controls',
    icon: Clock,
    color: 'amber',
    keys: [
      { key: 'freeze_attendance', icon: Activity, label: 'Attendance Marking', desc: 'Prevents employees from marking attendance' },
      { key: 'freeze_leave_requests', icon: BookOpen, label: 'Leave Requests', desc: 'Blocks new leave request submissions' },
      { key: 'freeze_early_leave', icon: Clock, label: 'Early Leave Requests', desc: 'Blocks early leave request submissions' },
      { key: 'freeze_employee_profile_edit', icon: User, label: 'Employee Profile Edit', desc: 'Prevents employees from editing their profile' },
    ]
  },
  {
    label: 'Financial Controls',
    icon: CreditCard,
    color: 'green',
    keys: [
      { key: 'freeze_payroll', icon: CreditCard, label: 'Payroll Section', desc: 'Hides payroll data from employees' },
    ]
  },
  {
    label: 'Communication Controls',
    icon: MessageSquare,
    color: 'purple',
    keys: [
      { key: 'freeze_employee_chat', icon: MessageSquare, label: 'Employee Chat', desc: 'Disables chat functionality for all employees' },
      { key: 'freeze_client_chat', icon: MessageSquare, label: 'Client Chat', desc: 'Disables chat functionality for all clients' },
      { key: 'freeze_complaints', icon: FileText, label: 'Complaints Section', desc: 'Prevents complaint submissions from clients' },
    ]
  },
  {
    label: 'Project & Tracking',
    icon: Activity,
    color: 'slate',
    keys: [
      { key: 'freeze_project_tracking', icon: Activity, label: 'Project Tracking', desc: 'Prevents clients from viewing project status' },
    ]
  },
];

const GROUP_COLORS = {
  blue: { badge: 'bg-blue-100 text-blue-700', border: 'border-blue-200', header: 'bg-blue-50' },
  amber: { badge: 'bg-amber-100 text-amber-700', border: 'border-amber-200', header: 'bg-amber-50' },
  green: { badge: 'bg-green-100 text-green-700', border: 'border-green-200', header: 'bg-green-50' },
  purple: { badge: 'bg-purple-100 text-purple-700', border: 'border-purple-200', header: 'bg-purple-50' },
  slate: { badge: 'bg-slate-100 text-slate-700', border: 'border-slate-200', header: 'bg-slate-50' },
};

export default function AdminSettings() {
  const { user, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [profile, setProfile] = useState({ full_name: '', phone: '' });
  const [passwords, setPasswords] = useState({ current_password: '', new_password: '', confirm: '' });
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState({ cur: false, new: false, cfm: false });

  // Freeze settings
  const [freezeSettings, setFreezeSettings] = useState({});
  const [freezeLoading, setFreezeLoading] = useState(false);
  const [freezeSaving, setFreezeSaving] = useState(false);
  const [freezeMsg, setFreezeMsg] = useState('');
  const [bulkAction, setBulkAction] = useState(null); // 'freeze_all' | 'unfreeze_all'

  useEffect(() => {
    api.get('/admin/settings/profile').then(r => setProfile({ full_name: r.data.full_name || '', phone: r.data.phone || '' })).catch(() => {});
    loadFreezeSettings();
  }, []);

  const loadFreezeSettings = async () => {
    setFreezeLoading(true);
    try {
      const r = await api.get('/admin/system-settings');
      const map = {};
      (r.data || []).forEach(s => { map[s.setting_key] = s.setting_value === '1'; });
      setFreezeSettings(map);
    } catch { setFreezeMsg('Failed to load settings'); }
    setFreezeLoading(false);
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    setLoading(true); setMsg({ type: '', text: '' });
    try {
      await api.put('/admin/settings/profile', profile);
      await refreshUser?.();
      setMsg({ type: 'success', text: 'Profile updated successfully.' });
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.error || 'Profile update failed.' });
    }
    setLoading(false);
  };

  const savePassword = async (e) => {
    e.preventDefault();
    if (passwords.new_password !== passwords.confirm) {
      setMsg({ type: 'error', text: 'Passwords do not match.' }); return;
    }
    setLoading(true); setMsg({ type: '', text: '' });
    try {
      await api.put('/admin/settings/password', { current_password: passwords.current_password, new_password: passwords.new_password });
      setPasswords({ current_password: '', new_password: '', confirm: '' });
      setMsg({ type: 'success', text: 'Password updated successfully.' });
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.error || 'Password update failed.' });
    }
    setLoading(false);
  };

  const toggleFreeze = (key) => {
    setFreezeSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const saveFreeze = async () => {
    setFreezeSaving(true); setFreezeMsg('');
    try {
      const settings = {};
      Object.entries(freezeSettings).forEach(([k, v]) => { settings[k] = v ? '1' : '0'; });
      await api.post('/admin/system-settings/bulk', { settings });
      setFreezeMsg('✅ Freeze settings saved successfully.');
      setTimeout(() => setFreezeMsg(''), 3000);
    } catch {
      setFreezeMsg('❌ Failed to save settings.');
    }
    setFreezeSaving(false);
  };

  const handleBulkFreeze = (freeze) => {
    const updated = { ...freezeSettings };
    FREEZE_GROUPS.forEach(g => g.keys.forEach(k => { updated[k.key] = freeze; }));
    setFreezeSettings(updated);
    setBulkAction(null);
  };

  const frozenCount = Object.values(freezeSettings).filter(Boolean).length;
  const totalCount = FREEZE_GROUPS.reduce((s, g) => s + g.keys.length, 0);

  const TABS = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'freeze', label: 'Freeze Controls', icon: Shield },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Admin Settings</h1>
        <p className="text-slate-500 text-sm mt-1">Manage your profile, security, and system controls.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => { setActiveTab(t.id); setMsg({ type: '', text: '' }); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === t.id ? 'bg-white shadow text-slate-800' : 'text-slate-600 hover:text-slate-800'}`}>
              <Icon className="w-4 h-4" />
              {t.label}
              {t.id === 'freeze' && frozenCount > 0 && (
                <span className="bg-amber-500 text-white text-xs rounded-full px-1.5 py-0.5 leading-none">{frozenCount}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800 mb-5">Profile Information</h2>
          {msg.text && (
            <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 text-sm ${msg.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
              {msg.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
              {msg.text}
            </div>
          )}
          <form onSubmit={saveProfile} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Full Name</label>
              <input value={profile.full_name} onChange={e => setProfile({ ...profile, full_name: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Your full name" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Phone</label>
              <input value={profile.phone} onChange={e => setProfile({ ...profile, phone: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="+91 9876543210" />
            </div>
            <div className="flex items-center gap-3 pt-1">
              <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center font-bold text-purple-700 text-lg">
                {(profile.full_name || user?.full_name || 'A')[0].toUpperCase()}
              </div>
              <div>
                <p className="font-medium text-slate-800">{profile.full_name || user?.full_name}</p>
                <p className="text-sm text-slate-500">{user?.email} • Admin</p>
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
              <Save className="w-4 h-4" /> {loading ? 'Saving...' : 'Save Profile'}
            </button>
          </form>
        </div>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800 mb-5">Change Password</h2>
          {msg.text && (
            <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 text-sm ${msg.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
              {msg.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
              {msg.text}
            </div>
          )}
          <form onSubmit={savePassword} className="space-y-5 max-w-md">
            {[
              { key: 'cur', field: 'current_password', label: 'Current Password', placeholder: 'Enter current password' },
              { key: 'new', field: 'new_password', label: 'New Password', placeholder: 'At least 8 characters' },
              { key: 'cfm', field: 'confirm', label: 'Confirm New Password', placeholder: 'Repeat new password' },
            ].map(({ key, field, label, placeholder }) => (
              <div key={field}>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
                <div className="relative">
                  <input type={showPw[key] ? 'text' : 'password'}
                    value={passwords[field]} onChange={e => setPasswords({ ...passwords, [field]: e.target.value })}
                    className="w-full px-4 py-2.5 pr-10 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={placeholder} required />
                  <button type="button" onClick={() => setShowPw(p => ({ ...p, [key]: !p[key] }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showPw[key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            ))}
            <button type="submit" disabled={loading}
              className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
              <Lock className="w-4 h-4" /> {loading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>
      )}

      {/* Freeze Controls Tab */}
      {activeTab === 'freeze' && (
        <div className="space-y-5">
          {/* Header Card */}
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-5 text-white shadow-sm">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <Shield className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">Freeze Controls</h2>
                  <p className="text-sm text-orange-100">Control system access for employees & clients</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold">{frozenCount}/{totalCount}</div>
                <div className="text-sm text-orange-100">sections frozen</div>
              </div>
            </div>
          </div>

          {/* Bulk actions */}
          <div className="flex gap-3 flex-wrap">
            <button onClick={() => handleBulkFreeze(true)}
              className="flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-red-600 transition-colors">
              <Lock className="w-4 h-4" /> Freeze All
            </button>
            <button onClick={() => handleBulkFreeze(false)}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-green-700 transition-colors">
              <Shield className="w-4 h-4" /> Unfreeze All
            </button>
            <button onClick={saveFreeze} disabled={freezeSaving}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors ml-auto">
              <Save className="w-4 h-4" /> {freezeSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>

          {freezeMsg && (
            <div className={`p-3 rounded-xl text-sm text-center font-medium ${freezeMsg.startsWith('✅') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
              {freezeMsg}
            </div>
          )}

          {freezeLoading ? (
            <div className="text-center py-12 text-slate-400">Loading settings...</div>
          ) : (
            FREEZE_GROUPS.map(group => {
              const GroupIcon = group.icon;
              const colors = GROUP_COLORS[group.color];
              const frozenInGroup = group.keys.filter(k => freezeSettings[k.key]).length;
              return (
                <div key={group.label} className={`bg-white rounded-2xl border ${colors.border} overflow-hidden shadow-sm`}>
                  <div className={`${colors.header} px-5 py-3.5 flex items-center justify-between border-b ${colors.border}`}>
                    <div className="flex items-center gap-2.5">
                      <GroupIcon className={`w-5 h-5 ${colors.badge.split(' ')[1]}`} />
                      <span className="font-semibold text-slate-800">{group.label}</span>
                    </div>
                    {frozenInGroup > 0 && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors.badge}`}>
                        {frozenInGroup} frozen
                      </span>
                    )}
                  </div>
                  <div className="divide-y divide-slate-100">
                    {group.keys.map(item => {
                      const ItemIcon = item.icon;
                      const isFrozen = freezeSettings[item.key] || false;
                      return (
                        <div key={item.key} className={`flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors ${isFrozen ? 'bg-red-50/30' : ''}`}>
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${isFrozen ? 'bg-red-100' : 'bg-slate-100'}`}>
                              <ItemIcon className={`w-4 h-4 ${isFrozen ? 'text-red-600' : 'text-slate-500'}`} />
                            </div>
                            <div>
                              <p className={`text-sm font-medium ${isFrozen ? 'text-red-700' : 'text-slate-800'}`}>{item.label}</p>
                              <p className="text-xs text-slate-500">{item.desc}</p>
                            </div>
                          </div>
                          <button onClick={() => toggleFreeze(item.key)} className="ml-4 flex-shrink-0 relative" title={isFrozen ? 'Click to unfreeze' : 'Click to freeze'}>
                            <div className={`w-12 h-6 rounded-full transition-colors duration-200 ${isFrozen ? 'bg-red-500' : 'bg-slate-200'}`}>
                              <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${isFrozen ? 'translate-x-6' : 'translate-x-0.5'}`} />
                            </div>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}

          {/* Save button bottom */}
          <div className="flex justify-end pt-2">
            <button onClick={saveFreeze} disabled={freezeSaving}
              className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm">
              <Save className="w-4 h-4" /> {freezeSaving ? 'Saving changes...' : 'Save All Freeze Settings'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
