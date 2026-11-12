import React from 'react';
import { useApp } from '../context/AppContext';
import {
  X,
  Printer,
  FileCheck2,
  Stamp,
  QrCode,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

export const PrintSlipModal: React.FC = () => {
  const { isPrintModalOpen, setIsPrintModalOpen, activeRequest } = useApp();

  if (!isPrintModalOpen || !activeRequest) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 print:p-0">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full overflow-hidden flex flex-col max-h-[95vh] print:max-h-none print:shadow-none print:border-none print:w-full">
        {/* Modal Toolbar (hidden on print) */}
        <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between print:hidden">
          <div className="flex items-center space-x-2">
            <Printer className="w-5 h-5 text-blue-400" />
            <h3 className="text-sm font-bold">เอกสารคำร้องอิเล็กทรอนิกส์ (Official e-Slip)</h3>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Printer className="w-4 h-4" />
              <span>พิมพ์เอกสาร / บันทึก PDF</span>
            </button>
            <button
              onClick={() => setIsPrintModalOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Paper Document (A4 format style) */}
        <div className="p-8 sm:p-10 overflow-y-auto font-sans bg-white text-slate-900 space-y-6">
          {/* Header */}
          <div className="border-b-2 border-slate-900 pb-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-2xl font-black text-red-700 tracking-tight">e-Service</span>
                <span className="text-xs px-2 py-0.5 bg-red-50 text-red-800 font-bold border border-red-200 rounded">
                  SMART PAPERLESS ORGANIZATION
                </span>
              </div>
              <p className="text-sm font-bold text-slate-700 mt-1">
                ใบสำคัญคำร้องอิเล็กทรอนิกส์และบันทึกการอนุมัติดิจิทัล
              </p>
              <p className="text-xs text-slate-500">
                ระบบจัดการเอกสารไร้กระดาษ ปลอดภัยด้วยการประทับตรารับรองดิจิทัล
              </p>
            </div>

            {/* QR Verification & Document Code */}
            <div className="flex items-center space-x-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200 shrink-0">
              <div className="w-16 h-16 bg-white p-1 rounded-lg border border-slate-300 flex items-center justify-center">
                {/* SVG QR Code Simulation */}
                <svg className="w-14 h-14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M2 2h8v8H2V2zm2 2v4h4V4H4zm10-2h8v8h-8V2zm2 2v4h4V4h-4zM2 14h8v8H2v-8zm2 2v4h4v-4H4zm14-2h4v2h-4v-2zm-4 0h2v4h-2v-4zm2 4h2v4h-2v-4zm2 2h2v2h-2v-2zm-6 2h2v2h-2v-2z" />
                </svg>
              </div>
              <div className="text-left text-xs">
                <span className="text-[10px] text-slate-400 block font-mono">DOCUMENT ID:</span>
                <span className="font-extrabold text-red-700 font-mono text-sm block">
                  {activeRequest.code}
                </span>
                <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5 mt-0.5">
                  <CheckCircle2 className="w-3 h-3" /> ยืนยันความถูกต้อง
                </span>
              </div>
            </div>
          </div>

          {/* Document Metadata Table */}
          <table className="w-full text-xs border border-slate-200">
            <tbody>
              <tr className="border-b border-slate-200 bg-slate-50/50">
                <td className="p-2.5 font-bold text-slate-600 w-1/4">ชื่อคำร้อง:</td>
                <td className="p-2.5 font-bold text-slate-900 w-3/4">{activeRequest.title}</td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="p-2.5 font-bold text-slate-600">ประเภทคำขอ:</td>
                <td className="p-2.5 font-semibold text-red-700">
                  {activeRequest.category}
                  {activeRequest.subCategory && (
                    <span className="text-slate-600 font-normal ml-2">
                      ({activeRequest.subCategory})
                    </span>
                  )}
                </td>
              </tr>
              <tr className="border-b border-slate-200 bg-slate-50/50">
                <td className="p-2.5 font-bold text-slate-600">ผู้ยื่นคำร้อง:</td>
                <td className="p-2.5 text-slate-800">
                  {activeRequest.requestorName} ({activeRequest.requestorDepartment})
                </td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="p-2.5 font-bold text-slate-600">วันที่ยื่นเรื่อง:</td>
                <td className="p-2.5 text-slate-800">{activeRequest.createdAt}</td>
              </tr>
              {activeRequest.amount && (
                <tr className="border-b border-slate-200 bg-slate-50/50">
                  <td className="p-2.5 font-bold text-slate-600">วงเงินงบประมาณ:</td>
                  <td className="p-2.5 font-extrabold text-red-700 text-sm">
                    ฿{activeRequest.amount.toLocaleString()} บาท
                  </td>
                </tr>
              )}
              <tr>
                <td className="p-2.5 font-bold text-slate-600 align-top">รายละเอียด:</td>
                <td className="p-2.5 text-slate-800 leading-relaxed">{activeRequest.details}</td>
              </tr>
            </tbody>
          </table>

          {/* Official Signatures & Digital Stamp Trail */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-3 flex items-center gap-1.5">
              <Stamp className="w-4 h-4 text-red-700" />
              <span>การประทับตรารับรองและสายการลงนามอิเล็กทรอนิกส์</span>
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {activeRequest.steps.map((st, i) => {
                const isSigned = st.status === 'approved';

                return (
                  <div
                    key={i}
                    className={`p-3 rounded-xl border text-center relative ${
                      isSigned ? 'border-red-200 bg-red-50/30' : 'border-slate-200 bg-slate-50/50'
                    }`}
                  >
                    <span className="block text-[10px] font-bold text-slate-400 uppercase">
                      {st.stepTitle}
                    </span>

                    {/* Stamp Graphic */}
                    <div className="h-16 flex items-center justify-center my-1.5">
                      {isSigned ? (
                        <div className="border-2 border-dashed border-emerald-600 rounded-lg p-1 text-emerald-800 rotate-[-4deg] shadow-xs">
                          <span className="text-[10px] font-black uppercase tracking-wider block">
                            ✓ ประทับตราอนุมัติ
                          </span>
                          <span className="text-[8px] font-mono text-emerald-600 block">
                            {st.timestamp?.split(' ')[0] || 'VERIFIED'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-300 italic">รอการลงนาม</span>
                      )}
                    </div>

                    <p className="text-xs font-bold text-slate-800 truncate">{st.approverName}</p>
                    <p className="text-[10px] text-slate-500 truncate">{st.approverRole}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Legal Paperless Note */}
          <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 gap-2">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
              เอกสารอิเล็กทรอนิกส์ฉบับนี้มีผลผูกพันตาม พ.ร.บ. ว่าด้วยธุรกรรมทางอิเล็กทรอนิกส์
            </span>
            <span className="font-mono">e-Service Security Signature: 100% Traceable</span>
          </div>
        </div>
      </div>
    </div>
  );
};
