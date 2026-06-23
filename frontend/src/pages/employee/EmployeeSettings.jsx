import { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function EmployeeSettings() {
  const { refreshUser } = useAuth();

  const [profile, setProfile] = useState({
    full_name: '',
    phone: '',
    department: '',
    designation: '',
  });

  const [passwords, setPasswords] = useState({
    current_password: '',
    new_password: '',
    confirm: '',
  });

  const [msg, setMsg] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(false);

  // ✅ LOAD DATA FROM BACKEND
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await api.get('/employee/settings/profile');

        setProfile({
          full_name: res.data.full_name || '',
          phone: res.data.phone || '',
          department: res.data.department || '',
          designation: res.data.designation || '',
        });
      } catch (err) {
        console.error(err);
        setMsg({ type: 'error', text: 'Failed to load profile' });
      }
    };

    loadProfile();
  }, []);

  // ✅ UPDATE PROFILE
  const saveProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg({ type: '', text: '' });

    try {
      await api.put('/employee/settings/profile', profile);
      await refreshUser?.();
      setMsg({ type: 'success', text: 'Profile updated.' });
    } catch (err) {
      setMsg({
        type: 'error',
        text: err.response?.data?.error || 'Update failed',
      });
    } finally {
      setLoading(false);
    }
  };

  // ✅ UPDATE PASSWORD
  const savePassword = async (e) => {
    e.preventDefault();

    if (passwords.new_password !== passwords.confirm) {
      setMsg({ type: 'error', text: 'Passwords do not match.' });
      return;
    }

    setLoading(true);

    try {
      await api.put('/employee/settings/password', {
        current_password: passwords.current_password,
        new_password: passwords.new_password,
      });

      setPasswords({
        current_password: '',
        new_password: '',
        confirm: '',
      });

      setMsg({ type: 'success', text: 'Password changed.' });
    } catch (err) {
      setMsg({
        type: 'error',
        text: err.response?.data?.error || 'Password update failed',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-2">Settings</h1>
      <p className="text-slate-600 mb-8">Employee profile</p>

      {msg.text && (
        <p
          className={`mb-4 text-sm p-3 rounded-lg ${
            msg.type === 'success'
              ? 'bg-green-50 text-green-800'
              : 'bg-red-50 text-red-700'
          }`}
        >
          {msg.text}
        </p>
      )}

      {/* PROFILE */}
      <form onSubmit={saveProfile} className="card space-y-4 mb-8">
        <h2 className="font-semibold text-lg">Profile</h2>

        <input
          className="input-field"
          placeholder="Full name"
          value={profile.full_name}
          onChange={(e) =>
            setProfile({ ...profile, full_name: e.target.value })
          }
        />

        <input
          className="input-field"
          placeholder="Phone"
          value={profile.phone}
          onChange={(e) =>
            setProfile({ ...profile, phone: e.target.value })
          }
        />

        <input
          className="input-field"
          placeholder="Department"
          value={profile.department}
          onChange={(e) =>
            setProfile({ ...profile, department: e.target.value })
          }
        />

        <input
          className="input-field"
          placeholder="Designation"
          value={profile.designation}
          onChange={(e) =>
            setProfile({ ...profile, designation: e.target.value })
          }
        />

        <button
          type="submit"
          className="btn-primary"
          disabled={loading}
        >
          Save profile
        </button>
      </form>

      {/* PASSWORD */}
      <form onSubmit={savePassword} className="card space-y-4">
        <h2 className="font-semibold text-lg">Change password</h2>

        <input
          className="input-field"
          type="password"
          placeholder="Current password"
          value={passwords.current_password}
          onChange={(e) =>
            setPasswords({
              ...passwords,
              current_password: e.target.value,
            })
          }
        />

        <input
          className="input-field"
          type="password"
          placeholder="New password"
          value={passwords.new_password}
          onChange={(e) =>
            setPasswords({
              ...passwords,
              new_password: e.target.value,
            })
          }
        />

        <input
          className="input-field"
          type="password"
          placeholder="Confirm password"
          value={passwords.confirm}
          onChange={(e) =>
            setPasswords({ ...passwords, confirm: e.target.value })
          }
        />

        <button
          type="submit"
          className="btn-primary"
          disabled={loading}
        >
          Update password
        </button>
      </form>
    </div>
  );
}