import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import LandingLayout from './layouts/LandingLayout';
import DashboardLayout from './layouts/DashboardLayout';
import Home from './pages/landing/Home';
import About from './pages/landing/About';
import Services from './pages/landing/Services';
import Features from './pages/landing/Features';
import HowItWorks from './pages/landing/HowItWorks';
import Contact from './pages/landing/Contact';
import ClientLogin from './pages/landing/ClientLogin';
import ClientRegister from './pages/landing/ClientRegister';
import ClientPortal from './pages/landing/ClientPortal';
import StaffLogin from './pages/landing/StaffLogin';
import StaffRegister from './pages/landing/StaffRegister';
import Enquiry from './pages/landing/Enquiry';
import Complaint from './pages/landing/Complaint';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminEmployees from './pages/admin/AdminEmployees';
import AdminProjects from './pages/admin/AdminProjects';
import AdminClients from './pages/admin/AdminClients';
import AdminDomains from './pages/admin/AdminDomains';
import AdminPayments from './pages/admin/AdminPayments';
import AdminPayroll from './pages/admin/AdminPayroll';
import AdminAttendance from './pages/admin/AdminAttendance';
import AdminLeaves from './pages/admin/AdminLeaves';
import AdminComplaints from './pages/admin/AdminComplaints';
import AdminReports from './pages/admin/AdminReports';
import AdminNotifications from './pages/admin/AdminNotifications';
import EmployeeDashboard from './pages/employee/EmployeeDashboard';
import EmployeeProjects from './pages/employee/EmployeeProjects';
import EmployeeAttendance from './pages/employee/EmployeeAttendance';
import EmployeeLeaves from './pages/employee/EmployeeLeaves';
import EmployeeEarlyLeave from './pages/employee/EmployeeEarlyLeave';
import EmployeePayroll from './pages/employee/EmployeePayroll';
import EmployeeAppraisals from './pages/employee/EmployeeAppraisals';
import EmployeePromotions from './pages/employee/EmployeePromotions';
import EmployeePerformance from './pages/employee/EmployeePerformance';
import AdminSettings from './pages/admin/AdminSettings';
import AdminOfferLetters from './pages/admin/AdminOfferLetters';
import AdminMeetings from './pages/admin/AdminMeetings';
import AdminHR from './pages/admin/AdminHR';
import DashboardChat from './pages/shared/DashboardChat';
import EmployeeSettings from './pages/employee/EmployeeSettings';
import EmployeeOfferLetters from './pages/employee/EmployeeOfferLetters';
import EmployeeMeetings from './pages/employee/EmployeeMeetings';
import ForgotPassword from './pages/landing/ForgotPassword';
import TrackProject from './pages/landing/TrackProject';

function ProtectedRoute({ children, role, loginTo = '/staff/login' }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!user) return <Navigate to={loginTo} replace />;
  if (role && user.role !== role) return <Navigate to={loginTo} replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/staff/login" element={<StaffLogin />} />
      <Route path="/staff/register" element={<StaffRegister />} />
      <Route element={<LandingLayout />}>
        <Route path="/about" element={<About />} />
        <Route path="/services" element={<Services />} />
        <Route path="/features" element={<Features />} />
        <Route path="/how-it-works" element={<HowItWorks />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/client/login" element={<ClientLogin />} />
        <Route path="/client/register" element={<ClientRegister />} />
        <Route path="/client/portal" element={<ProtectedRoute role="client" loginTo="/client/login"><ClientPortal /></ProtectedRoute>} />
        <Route path="/track" element={<TrackProject />} />
        <Route path="/admin/register" element={<Navigate to="/staff/register" replace />} />
        <Route path="/employee/register" element={<Navigate to="/staff/register" replace />} />
        <Route path="/enquiry" element={<Enquiry />} />
        <Route path="/complaint" element={<Complaint />} />
        <Route path="/login" element={<Navigate to="/staff/login" replace />} />
        <Route path="/register" element={<Navigate to="/staff/register" replace />} />
      </Route>

      <Route path="/admin" element={<ProtectedRoute role="admin"><DashboardLayout type="admin" /></ProtectedRoute>}>
        <Route index element={<AdminDashboard />} />
        <Route path="clients" element={<AdminClients />} />
        <Route path="employees" element={<AdminEmployees />} />
        <Route path="projects" element={<AdminProjects />} />
        <Route path="domains" element={<AdminDomains />} />
        <Route path="payments" element={<AdminPayments />} />
        <Route path="payroll" element={<AdminPayroll />} />
        <Route path="attendance" element={<AdminAttendance />} />
        <Route path="leaves" element={<AdminLeaves />} />
        <Route path="complaints" element={<AdminComplaints />} />
        <Route path="reports" element={<AdminReports />} />
        <Route path="notifications" element={<AdminNotifications />} />
        <Route path="settings" element={<AdminSettings />} />
        <Route path="offer-letters" element={<AdminOfferLetters />} />
        <Route path="meetings" element={<AdminMeetings />} />
        <Route path="chat" element={<DashboardChat postPath="/admin/chat" />} />
        <Route path="hr" element={<AdminHR />} />
      </Route>

      <Route path="/employee" element={<ProtectedRoute role="employee"><DashboardLayout type="employee" /></ProtectedRoute>}>
        <Route index element={<EmployeeDashboard />} />
        <Route path="projects" element={<EmployeeProjects />} />
        <Route path="attendance" element={<EmployeeAttendance />} />
        <Route path="leaves" element={<EmployeeLeaves />} />
        <Route path="early-leave" element={<EmployeeEarlyLeave />} />
        <Route path="payroll" element={<EmployeePayroll />} />
        <Route path="appraisals" element={<EmployeeAppraisals />} />
        <Route path="promotions" element={<EmployeePromotions />} />
        <Route path="performance" element={<EmployeePerformance />} />
        <Route path="settings" element={<EmployeeSettings />} />
        <Route path="offer-letters" element={<EmployeeOfferLetters />} />
        <Route path="meetings" element={<EmployeeMeetings />} />
        <Route path="chat" element={<DashboardChat postPath="/employee/chat" />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}