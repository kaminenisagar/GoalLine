export default function About() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <h1 className="text-4xl font-bold mb-6">About GoalLine</h1>
      <div className="prose prose-slate max-w-none space-y-4 text-slate-600">
        <p>
          GoalLine is a modern full-stack enterprise workflow management system built with React,
          Node.js, Express.js, and MySQL. We help businesses manage complete operations — projects,
          employees, payroll, attendance, communication, and client delivery — through one secure platform.
        </p>
        <p>
          Our mission is to simplify project management, enhance communication between admins, employees,
          and clients, and improve productivity through workflow automation and real-time visibility.
        </p>
        <p>
          Clients interact entirely through our professional landing page — no separate client dashboard
          required. Admins and employees use dedicated secure portals with role-based access control.
        </p>
      </div>
    </div>
  );
}
