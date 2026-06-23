import { Globe, Smartphone, ShoppingCart, Code, Palette, Cloud } from 'lucide-react';

const services = [
  { icon: Globe, title: 'Web Development', desc: 'Custom websites and web applications tailored to your business.' },
  { icon: Smartphone, title: 'Mobile Apps', desc: 'iOS and Android applications with seamless user experiences.' },
  { icon: ShoppingCart, title: 'E-Commerce', desc: 'Online stores with payment integration and inventory management.' },
  { icon: Code, title: 'Custom Software', desc: 'Enterprise software solutions built to your specifications.' },
  { icon: Palette, title: 'UI/UX Design', desc: 'Modern, responsive designs that engage your users.' },
  { icon: Cloud, title: 'Hosting & Domains', desc: 'Domain setup, hosting configuration, and deployment.' },
];

export default function Services() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-16">
      <h1 className="text-4xl font-bold text-center mb-4">Our Services</h1>
      <p className="text-slate-600 text-center max-w-2xl mx-auto mb-12">
        From enquiry to delivery — we handle your entire project lifecycle.
      </p>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {services.map(({ icon: Icon, title, desc }) => (
          <div key={title} className="card hover:shadow-md transition-shadow">
            <Icon className="w-10 h-10 text-brand-600 mb-4" />
            <h3 className="font-semibold text-lg">{title}</h3>
            <p className="text-slate-600 mt-2">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
