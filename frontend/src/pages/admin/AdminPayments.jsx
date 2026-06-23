import { useEffect, useState } from 'react';
import api from '../../services/api';

export default function AdminPayments() {
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [tab, setTab] = useState('invoices');
  const [invoiceForm, setInvoiceForm] = useState({ project_id: '', amount: '', due_date: '', notes: '' });
  const [paymentForm, setPaymentForm] = useState({ invoice_id: '', amount: '', payment_method: '', transaction_ref: '' });
  const [projects, setProjects] = useState([]);

  const load = async () => {
    const [inv, pay, proj] = await Promise.all([
      api.get('/admin/invoices'),
      api.get('/admin/payments'),
      api.get('/admin/projects'),
    ]);
    setInvoices(inv.data);
    setPayments(pay.data);
    setProjects(proj.data);
  };

  useEffect(() => { load(); }, []);

  const createInvoice = async (e) => {
    e.preventDefault();
    await api.post('/admin/invoices', {
      project_id: Number(invoiceForm.project_id),
      amount: parseFloat(invoiceForm.amount),
      due_date: invoiceForm.due_date || null,
      notes: invoiceForm.notes || null,
    });
    setInvoiceForm({ project_id: '', amount: '', due_date: '', notes: '' });
    load();
  };

  const recordPayment = async (e) => {
    e.preventDefault();
    await api.post('/admin/payments', {
      invoice_id: Number(paymentForm.invoice_id),
      amount: parseFloat(paymentForm.amount),
      payment_method: paymentForm.payment_method || null,
      transaction_ref: paymentForm.transaction_ref || null,
    });
    setPaymentForm({ invoice_id: '', amount: '', payment_method: '', transaction_ref: '' });
    load();
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-8">Payments & Invoices</h1>

      <div className="flex gap-2 mb-6">
        <button
          type="button"
          onClick={() => setTab('invoices')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'invoices' ? 'bg-brand-600 text-white' : 'bg-slate-200'}`}
        >
          Invoices
        </button>
        <button
          type="button"
          onClick={() => setTab('payments')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'payments' ? 'bg-brand-600 text-white' : 'bg-slate-200'}`}
        >
          Payments
        </button>
        <button
          type="button"
          onClick={() => setTab('create')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'create' ? 'bg-brand-600 text-white' : 'bg-slate-200'}`}
        >
          Create / Record
        </button>
      </div>

      {tab === 'invoices' && (
        <div className="space-y-3">
          {invoices.map((inv) => (
            <div key={inv.id} className="card flex flex-wrap justify-between gap-4">
              <div>
                <p className="font-semibold">{inv.invoice_number}</p>
                <p className="text-sm text-slate-500">{inv.project_title} · {inv.tracking_id}</p>
                <p className="text-lg font-bold text-brand-600 mt-1">${inv.amount}</p>
              </div>
              <span className="capitalize text-sm h-fit px-3 py-1 rounded-full bg-slate-100">{inv.status}</span>
            </div>
          ))}
          {!invoices.length && <p className="text-slate-500">No invoices yet.</p>}
        </div>
      )}

      {tab === 'payments' && (
        <div className="space-y-3">
          {payments.map((pay) => (
            <div key={pay.id} className="card flex flex-wrap justify-between gap-4">
              <div>
                <p className="font-semibold">${pay.amount}</p>
                <p className="text-sm text-slate-500">{pay.invoice_number} · {pay.project_title}</p>
                {pay.payment_method && <p className="text-sm text-slate-500">{pay.payment_method}</p>}
                {pay.transaction_ref && <p className="text-xs font-mono text-slate-400">{pay.transaction_ref}</p>}
              </div>
              <p className="text-sm text-slate-500">{pay.paid_at && new Date(pay.paid_at).toLocaleDateString()}</p>
            </div>
          ))}
          {!payments.length && <p className="text-slate-500">No payments recorded yet.</p>}
        </div>
      )}

      {tab === 'create' && (
        <div className="grid lg:grid-cols-2 gap-8">
          <form onSubmit={createInvoice} className="card space-y-4">
            <h2 className="font-semibold">Create Invoice</h2>
            <select
              className="input-field"
              required
              value={invoiceForm.project_id}
              onChange={(e) => setInvoiceForm({ ...invoiceForm, project_id: e.target.value })}
            >
              <option value="">Select project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.title} ({p.tracking_id})</option>
              ))}
            </select>
            <input
              className="input-field"
              type="number"
              step="0.01"
              placeholder="Amount"
              required
              value={invoiceForm.amount}
              onChange={(e) => setInvoiceForm({ ...invoiceForm, amount: e.target.value })}
            />
            <input
              className="input-field"
              type="date"
              value={invoiceForm.due_date}
              onChange={(e) => setInvoiceForm({ ...invoiceForm, due_date: e.target.value })}
            />
            <input
              className="input-field"
              placeholder="Notes"
              value={invoiceForm.notes}
              onChange={(e) => setInvoiceForm({ ...invoiceForm, notes: e.target.value })}
            />
            <button type="submit" className="btn-primary">Create Invoice</button>
          </form>

          <form onSubmit={recordPayment} className="card space-y-4">
            <h2 className="font-semibold">Record Payment</h2>
            <select
              className="input-field"
              required
              value={paymentForm.invoice_id}
              onChange={(e) => setPaymentForm({ ...paymentForm, invoice_id: e.target.value })}
            >
              <option value="">Select invoice</option>
              {invoices.map((inv) => (
                <option key={inv.id} value={inv.id}>{inv.invoice_number} — ${inv.amount}</option>
              ))}
            </select>
            <input
              className="input-field"
              type="number"
              step="0.01"
              placeholder="Amount"
              required
              value={paymentForm.amount}
              onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
            />
            <input
              className="input-field"
              placeholder="Payment method"
              value={paymentForm.payment_method}
              onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}
            />
            <input
              className="input-field"
              placeholder="Transaction reference"
              value={paymentForm.transaction_ref}
              onChange={(e) => setPaymentForm({ ...paymentForm, transaction_ref: e.target.value })}
            />
            <button type="submit" className="btn-primary">Record Payment</button>
          </form>
        </div>
      )}
    </div>
  );
}
