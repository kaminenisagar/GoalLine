import { useState, useEffect } from 'react';
import http from '../../api/index';
import { MessageSquare, Eye, X, Clock, Users, Trash2 } from 'lucide-react';

export default function AdminChatReports() {
    const [reports, setReports] = useState([]);
    const [selectedReport, setSelectedReport] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchReports();
    }, []);

    const fetchReports = async () => {
        try {
            setLoading(true);

            const response = await http.get('/admin/chat-reports');

            console.log("CHAT REPORTS:", response.data);

            setReports(Array.isArray(response.data)
            ? response.data
            : []);

        } catch (err) {
            console.error(err);
            setReports([]);
        } finally {
            setLoading(false);
        }
    };

    const viewReport = (report) => {
        setSelectedReport(report);
    };

    const closeModal = () => setSelectedReport(null);

    if (loading) return <div className="p-8 text-center">Loading chat history...</div>;

    return (
        <div className="p-6">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <MessageSquare className="w-6 h-6 text-purple-600" />
                    Chat History (Ended Peer Chats)
                </h2>
                <button
                    onClick={fetchReports}
                    className="px-3 py-1.5 bg-slate-100 rounded-lg text-sm hover:bg-slate-200"
                >
                    Refresh
                </button>
            </div>

            {reports.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                    <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>No ended peer chats reported yet.</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm border border-slate-200 rounded-lg">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-4 py-3 text-left">Ended By</th>
                                <th className="px-4 py-3 text-left">Participants</th>
                                <th className="px-4 py-3 text-left">Reason</th>
                                <th className="px-4 py-3 text-left">Messages</th>
                                <th className="px-4 py-3 text-left">Ended At</th>
                                <th className="px-4 py-3 text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reports.map((report) => (
                                <tr key={report.id} className="border-t border-slate-100 hover:bg-slate-50">
                                    <td className="px-4 py-3">
                                        {report.ended_by}<br/>
                                        <span className="text-xs text-slate-400">{report.ended_by_role}</span>
                                    </td>
                                    <td className="px-4 py-3">
                                        {report.requester_name} ↔ {report.requested_name}
                                    </td>
                                    <td className="px-4 py-3 max-w-xs truncate">{report.reason || '—'}</td>
                                    <td className="px-4 py-3 text-center">{report.total_messages}</td>
                                    <td className="px-4 py-3">
                                        {new Date(report.reported_at).toLocaleString()}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <button
                                            onClick={() => viewReport(report)}
                                            className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200"
                                        >
                                            <Eye className="w-4 h-4" /> View
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal to view full chat history */}
            {selectedReport && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[80vh] flex flex-col">
                        <div className="p-5 border-b flex items-center justify-between">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                <Users className="w-5 h-5 text-purple-600" />
                                Chat History
                            </h3>
                            <button onClick={closeModal} className="p-1.5 hover:bg-slate-100 rounded-lg">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-4 border-b bg-slate-50 text-sm">
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <span className="font-semibold">Ended by:</span> {selectedReport.ended_by} ({selectedReport.ended_by_role})
                                </div>
                                <div>
                                    <span className="font-semibold">Reason:</span> {selectedReport.reason || '—'}
                                </div>
                                <div>
                                    <span className="font-semibold">Participants:</span> {selectedReport.requester_name} ↔ {selectedReport.requested_name}
                                </div>
                                <div>
                                    <span className="font-semibold">Date:</span> {new Date(selectedReport.reported_at).toLocaleString()}
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
                            {selectedReport.chat_history?.length > 0 ? (
                                selectedReport.chat_history.map((msg, idx) => (
                                    <div key={idx} className="flex">
                                        <div className="max-w-[80%]">
                                            <div className="text-xs text-slate-500 mb-1">{msg.sender_name || 'Unknown'}</div>
                                            <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-sm text-sm">
                                                {msg.message}
                                            </div>
                                            <div className="text-xs text-slate-400 mt-1">
                                                {new Date(msg.created_at).toLocaleString()}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-center text-slate-400 py-8">No message history saved.</p>
                            )}
                        </div>
                        <div className="p-4 border-t flex justify-end">
                            <button
                                onClick={closeModal}
                                className="px-4 py-2 bg-slate-200 rounded-lg hover:bg-slate-300"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}