const features = [
  { category: 'Security', items: ['OTP login verification', 'JWT authentication', 'Role-based access control', 'Secure REST APIs'] },
  { category: 'Project Management', items: ['Project tracking by ID or email', 'Stage-wise progress updates', 'Employee assignment & reassignment', 'Quality review workflow'] },
  { category: 'HR & Payroll', items: ['Attendance tracking', 'Leave management', 'Payroll processing', 'Payslip downloads', 'Appraisals & salary hikes'] },
  { category: 'Communication', items: ['Real-time chat', 'Meeting scheduling', 'Automated email notifications', 'Payment reminders'] },
  { category: 'Client Services', items: ['Enquiry forms', 'Complaint tickets', 'Feedback & ratings', 'Invoice & payment tracking', 'Domain & delivery updates'] },
];

export default function Features() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-16">
      <h1 className="text-4xl font-bold text-center mb-4">Platform Features</h1>
      <p className="text-slate-600 text-center max-w-2xl mx-auto mb-12">
        Everything you need to run your business workflow in one place.
      </p>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map(({ category, items }) => (
          <div key={category} className="card">
            <h3 className="font-semibold text-lg text-brand-700 mb-4">{category}</h3>
            <ul className="space-y-2">
              {items.map((item) => (
                <li key={item} className="flex items-start gap-2 text-slate-600 text-sm">
                  <span className="text-green-500 mt-0.5">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
