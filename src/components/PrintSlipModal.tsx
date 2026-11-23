import React, { forwardRef, useRef, useState } from 'react';
import { closeOnBackdrop } from './backdrop';
import { useApp } from '../context/AppContext';
import { DocumentRequest } from '../types';
import { MemoDocument } from './MemoDocument';
import { ItRequestDocument } from './ItRequestDocument';
import { PoRequestDocument } from './PoRequestDocument';
import { QuotationDocument } from './QuotationDocument';
import companyLogo from '../assets/company-logo.png';
import {
  X,
  FileDown,
  FileCheck2,
  Loader2,
  Stamp,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

// A4 at 96 dpi: the PDF copy is laid out at this width so it looks the same on every screen
const A4_WIDTH_PX = 794;
const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;

interface SlipDocumentProps {
  request: DocumentRequest;
  /** Lay out at full A4 width regardless of the screen (used for the PDF copy). */
  forExport?: boolean;
}

/** The e-Slip itself: shown in the window and drawn into the PDF. */
const SlipDocument = forwardRef<HTMLDivElement, SlipDocumentProps>(({ request, forExport = false }, ref) => {
  // On screen the slip follows the window width; in the PDF it always uses the wide layout
  const layout = (screen: string, pdf: string) => (forExport ? pdf : screen);

  return (
    <div
      ref={ref}
      className={`${layout('p-8 sm:p-10 overflow-y-auto', 'p-12')} font-sans bg-white text-slate-900 space-y-6`}
      style={forExport ? { width: A4_WIDTH_PX } : undefined}
    >
      {/* Header */}
      <div
        className={`border-b-2 border-slate-900 pb-5 flex ${layout('flex-col sm:flex-row sm:items-start', 'flex-row items-start')} justify-between gap-4`}
      >
        <div className="flex items-start gap-3">
          <img src={companyLogo} alt="" className="w-14 h-14 object-contain shrink-0" />
          <div>
            <span className="text-2xl font-black text-red-700 tracking-tight">JMI E-Service</span>
            <p className="text-sm font-bold text-slate-700 mt-1">ใบสำคัญคำร้องอิเล็กทรอนิกส์และบันทึกการอนุมัติดิจิทัล</p>
            <p className="text-xs text-slate-500">ระบบจัดการเอกสารไร้กระดาษ ปลอดภัยด้วยการประทับตรารับรองดิจิทัล</p>
          </div>
        </div>

        {/* Document code */}
        <div className="bg-slate-50 px-3.5 py-2.5 rounded-xl border border-slate-200 shrink-0">
          <div className="text-left text-xs">
            <span className="text-[10px] text-slate-400 block font-mono">DOCUMENT ID:</span>
            <span className="font-extrabold text-red-700 font-mono text-sm block">{request.code}</span>
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
            <td className="p-2.5 font-bold text-slate-900 w-3/4">{request.title}</td>
          </tr>
          <tr className="border-b border-slate-200">
            <td className="p-2.5 font-bold text-slate-600">ประเภทคำขอ:</td>
            <td className="p-2.5 font-semibold text-red-700">
              {request.category}
              {request.subCategory && (
                <span className="text-slate-600 font-normal ml-2">({request.subCategory})</span>
              )}
            </td>
          </tr>
          <tr className="border-b border-slate-200 bg-slate-50/50">
            <td className="p-2.5 font-bold text-slate-600">ผู้ยื่นคำร้อง:</td>
            <td className="p-2.5 text-slate-800">
              {request.requestorName} ({request.requestorDepartment})
            </td>
          </tr>
          <tr className="border-b border-slate-200">
            <td className="p-2.5 font-bold text-slate-600">วันที่ยื่นเรื่อง:</td>
            <td className="p-2.5 text-slate-800">{request.createdAt}</td>
          </tr>
          {request.amount && (
            <tr className="border-b border-slate-200 bg-slate-50/50">
              <td className="p-2.5 font-bold text-slate-600">วงเงินงบประมาณ:</td>
              <td className="p-2.5 font-extrabold text-red-700 text-sm">฿{request.amount.toLocaleString()} บาท</td>
            </tr>
          )}
          <tr>
            <td className="p-2.5 font-bold text-slate-600 align-top">รายละเอียด:</td>
            <td className="p-2.5 text-slate-800 leading-relaxed whitespace-pre-line">{request.details}</td>
          </tr>
        </tbody>
      </table>

      {/* Official Signatures & Digital Stamp Trail */}
      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-3 flex items-center gap-1.5">
          <Stamp className="w-4 h-4 text-red-700" />
          <span>การประทับตรารับรองและสายการลงนามอิเล็กทรอนิกส์</span>
        </h4>

        <div className={`grid ${layout('grid-cols-2 sm:grid-cols-4', 'grid-cols-4')} gap-3`}>
          {request.steps.map((st, i) => {
            const isSigned = st.status === 'approved';

            return (
              <div
                key={i}
                className={`p-3 rounded-xl border text-center relative ${
                  isSigned ? 'border-red-200 bg-red-50/30' : 'border-slate-200 bg-slate-50/50'
                }`}
              >
                <span className="block text-[10px] font-bold text-slate-400 uppercase">{st.stepTitle}</span>

                {/* Stamp Graphic */}
                <div className="h-16 flex items-center justify-center my-1.5">
                  {isSigned ? (
                    <div className="border-2 border-dashed border-emerald-600 rounded-lg p-1 text-emerald-800 rotate-[-4deg] shadow-xs">
                      <span className="text-[10px] font-black uppercase tracking-wider block">✓ ประทับตราอนุมัติ</span>
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
      <div
        className={`pt-4 border-t border-slate-200 flex ${layout('flex-col sm:flex-row', 'flex-row')} items-center justify-between text-[11px] text-slate-400 gap-2`}
      >
        <span className="flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
          เอกสารอิเล็กทรอนิกส์ฉบับนี้มีผลผูกพันตาม พ.ร.บ. ว่าด้วยธุรกรรมทางอิเล็กทรอนิกส์
        </span>
        <span className="font-mono">JMI E-Service Security Signature: 100% Traceable</span>
      </div>
    </div>
  );
});
SlipDocument.displayName = 'SlipDocument';

/** Draws the slip into an A4 PDF (more pages if it is longer than one) and saves it. */
const saveSlipAsPdf = async (node: HTMLElement, fileName: string) => {
  // Loaded on demand so the PDF libraries are not part of every page load
  const [{ toJpeg }, { jsPDF }] = await Promise.all([import('html-to-image'), import('jspdf')]);
  await document.fonts.ready;

  const image = await toJpeg(node, { pixelRatio: 2, quality: 0.92, backgroundColor: '#ffffff', cacheBust: true });
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const imageHeightMm = (node.offsetHeight * A4_WIDTH_MM) / node.offsetWidth;

  let offset = 0;
  pdf.addImage(image, 'JPEG', 0, 0, A4_WIDTH_MM, imageHeightMm);
  while (imageHeightMm - offset > A4_HEIGHT_MM + 1) {
    offset += A4_HEIGHT_MM;
    pdf.addPage();
    pdf.addImage(image, 'JPEG', 0, -offset, A4_WIDTH_MM, imageHeightMm);
  }
  pdf.save(fileName);
};

export const PrintSlipModal: React.FC = () => {
  const { isPrintModalOpen, setIsPrintModalOpen, activeRequest, showToast } = useApp();
  const exportRef = useRef<HTMLDivElement>(null);
  const [isSaving, setIsSaving] = useState(false);

  if (!isPrintModalOpen || !activeRequest) return null;

  // Only a fully approved request gets the official PDF
  const isApproved = activeRequest.status === 'approved';

  // A memo is printed in its own layout and named after its memo number
  const isMemo = !!activeRequest.memo;
  const isItRequest = !!activeRequest.itRequest;
  const isPoRequest = !!activeRequest.poRequest;
  const isQuotation = !!activeRequest.quotation;
  const Paper = isMemo
    ? MemoDocument
    : isItRequest
      ? ItRequestDocument
      : isPoRequest
        ? PoRequestDocument
        : isQuotation
          ? QuotationDocument
          : SlipDocument;
  const fileName = isMemo
    ? activeRequest.memo!.docNo.startsWith('MEMO-')
      ? `${activeRequest.memo!.docNo}.pdf`
      : `Memo-${activeRequest.memo!.docNo.replace('/', '-')}.pdf` // older numbers such as IT015/69
    : isPoRequest && !activeRequest.code.startsWith('JRF-')
      ? `JRF-${activeRequest.code}.pdf` // JRFs numbered before the JRF- prefix (PO-yyyy-nnnn)
      : `${activeRequest.code}.pdf`;

  const handleDownload = async () => {
    if (!exportRef.current || isSaving) return;
    setIsSaving(true);
    try {
      await saveSlipAsPdf(exportRef.current, fileName);
      showToast(`บันทึก ${fileName} แล้ว`, 'success');
    } catch (error) {
      console.error('PDF export failed', error);
      showToast('สร้าง PDF ไม่สำเร็จ ลองใหม่อีกครั้ง', 'warning');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div {...closeOnBackdrop(() => setIsPrintModalOpen(false))}
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full overflow-hidden flex flex-col max-h-[95vh]">
        {/* Modal Toolbar */}
        <div className="bg-slate-900 text-white px-5 py-3.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <FileCheck2 className="w-5 h-5 text-blue-400" />
            <h3 className="text-sm font-bold">
              {isMemo
                ? 'บันทึกภายใน (Memorandum)'
                : isItRequest
                  ? 'IT & Request Form'
                  : isPoRequest
                    ? 'P&O Business Requirement (JRF)'
                    : isQuotation
                      ? 'ข้อเสนอการประกันภัย (Quotation)'
                      : 'เอกสารคำร้องอิเล็กทรอนิกส์ (Official e-Slip)'}
            </h3>
          </div>
          <div className="flex items-center space-x-2">
            {isApproved ? (
              <button
                onClick={handleDownload}
                disabled={isSaving}
                className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-70 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 cursor-pointer disabled:cursor-wait shadow-xs"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                <span>{isSaving ? 'กำลังสร้าง PDF...' : 'ดาวน์โหลด PDF'}</span>
              </button>
            ) : (
              <span className="text-[11px] text-slate-300">ดาวน์โหลด PDF ได้เมื่ออนุมัติครบทุกขั้น</span>
            )}
            <button
              onClick={() => setIsPrintModalOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              aria-label="ปิด"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <Paper request={activeRequest} />
      </div>

      {/* Off-screen A4-width copy that the PDF is drawn from */}
      {isApproved && (
        <div aria-hidden="true" className="fixed top-0 left-[-10000px] pointer-events-none">
          <Paper ref={exportRef} request={activeRequest} forExport />
        </div>
      )}
    </div>
  );
};
