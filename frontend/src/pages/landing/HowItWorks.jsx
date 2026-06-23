import { Link } from 'react-router-dom';
import { MessageSquare, FileCheck, Code, TestTube, Globe, Rocket } from 'lucide-react';

const steps = [
  {
    icon: MessageSquare,
    title: 'Submit Enquiry',
    desc: 'Tell GoalLine about your project via enquiry form or client registration.',
  },
  {
    icon: FileCheck,
    title: 'Project Kickoff',
    desc: 'Admin reviews requirements, creates the project, and assigns your dedicated team.',
  },
  {
    icon: Code,
    title: 'Development',
    desc: 'Assigned employees build your solution with progress tracked in real time.',
  },
  {
    icon: TestTube,
    title: 'Testing & Review',
    desc: 'Quality checks run before delivery. You review work in your client portal.',
  },
  {
    icon: Globe,
    title: 'Domain & Hosting',
    desc: 'GoalLine sends domain and hosting details to your portal when ready.',
  },
  {
    icon: Rocket,
    title: 'Final Delivery',
    desc: 'Approve delivery, complete payments, and launch with full tracking history.',
  },
];

export default function HowItWorks() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-16">
      <h1 className="text-4xl font-bold text-center mb-4">How GoalLine Works</h1>
      <p className="text-slate-600 text-center max-w-2xl mx-auto mb-16">
        A clear six-step process from first contact to final delivery — transparent for clients, efficient for staff.
      </p>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        {steps.map(({ icon: Icon, title, desc }, i) => (
          <div key={title} className="card relative">
            <span className="absolute -top-3 -left-3 w-10 h-10 bg-brand-600 text-white rounded-full flex items-center justify-center font-bold">
              {i + 1}
            </span>
            <Icon className="w-10 h-10 text-brand-600 mb-4 mt-2" />
            <h3 className="font-semibold text-lg">{title}</h3>
            <p className="text-slate-600 mt-2">{desc}</p>
          </div>
        ))}
      </div>

      <div className="mt-16 text-center">
        <p className="text-slate-600 mb-6">Ready to start your project with GoalLine?</p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link to="/client/register" className="btn-primary">Client Register</Link>
          <Link to="/enquiry" className="btn-secondary">Submit Enquiry</Link>
          <Link to="/track" className="btn-secondary">Track Project</Link>
        </div>
      </div>
    </div>
  );
}
