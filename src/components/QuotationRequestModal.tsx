import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { MenuItemPermission, QuotationData } from '../types';
import { nextRequestCodeFor } from '../utils/forms';
import {
  CONSTRUCTION_CLASSES,
  QUOTATION_DEFAULTS,
  QUOTATION_PERIOD_UNITS,
  QUOTATION_SIGNER_TITLE,
  QUOTATION_TYPES,
  STANDARD_EXCLUSIONS,
  formatBaht,
  longThaiDate,
  quotationTitle,
} from '../utils/quotation';
import { DraftNotice, SaveDraftButton, useFormDraft } from './FormDraft';
import { FilePicker, PickedFile } from './FilePicker';
import { AlertTriangle, Lock, Plus, Send, Trash2, X } from 'lucide-react';

type Fields = Omit<QuotationData, 'docNo' | 'date' | 'exclusions'>;
interface Saved {
  fields: Fields;
  standardExclusions: string[];
  otherExclusions: string[];
  files: PickedFile[];
  signerId: string;
}

/** Keep only digits and one decimal point, e.g. "20,000.50" → "20000.50". */
const amountOnly = (value: string) => value.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1');

/** A titled block of the form, numbered as on the draft design. */
const Section: React.FC<{ n: number; title: string; children: React.ReactNode }> = ({ n, title, children }) => (
  <section className="space-y-3">
    <h3 className="flex items-center gap-2 text-[13px] font-bold text-slate-900">
      <span className="w-5 h-5 rounded-full bg-red-600 text-white text-[11px] flex items-center justify-center">{n}</span>
      {title}
    </h3>
    <div className="space-y-3 pl-7">{children}</div>
  </section>
);

/** Fill in an insurance quotation (ข้อเสนอการประกันภัย) and send it to the chosen signer. */
export const QuotationRequestModal: React.FC<{ form: MenuItemPermission; onClose: () => void }> = ({
  form,
  onClose,
}) => {
  const { workflows, employees, currentUser, requests, createNewRequest } = useApp();
  const workflow = workflows.find(w => w.id === form.workflowId);
  const signerStep = workflow?.steps.find(step => step.approverType === 'requester_picks');

  const draft = useFormDraft<Saved>(form);
  const saved = draft.restored;
  const [fields, setFields] = useState<Fields>(() => {
    const { exclusions: _ignored, ...defaults } = QUOTATION_DEFAULTS;
    return { ...defaults, ...saved?.fields };
  });
  const [standardExclusions, setStandardExclusions] = useState<string[]>(
    saved?.standardExclusions ?? [...STANDARD_EXCLUSIONS]
  );
  const [otherExclusions, setOtherExclusions] = useState<string[]>(saved?.otherExclusions ?? []);
  const [files, setFiles] = useState<PickedFile[]>(saved?.files ?? []);
  const [signerId, setSignerId] = useState(saved?.signerId ?? '');
  const [error, setError] = useState('');

  const set = <K extends keyof Fields>(key: K, value: Fields[K]) => setFields(prev => ({ ...prev, [key]: value }));
  const toggleClass = (value: number) =>
    set(
      'constructionClasses',
      fields.constructionClasses.includes(value)
        ? fields.constructionClasses.filter(v => v !== value)
        : [...fields.constructionClasses, value].sort()
    );
  const toggleExclusion = (clause: string) =>
    setStandardExclusions(prev =>
      prev.includes(clause) ? prev.filter(c => c !== clause) : STANDARD_EXCLUSIONS.filter(c => c === clause || prev.includes(c))
    );

  // Anyone but the person filling it in may sign, except people who are switched off
  const signers = employees
    .filter(e => e.id !== currentUser.id && !e.disabled)
    .sort((a, b) => a.name.localeCompare(b.name, 'th'));

  const saveDraft = () => {
    draft.save(fields.insured ? quotationTitle(fields) : '', {
      fields,
      standardExclusions,
      otherExclusions,
      files,
      signerId,
    });
    onClose();
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const required: [keyof Fields, string][] = [
      ['insured', 'ผู้เอาประกันภัย'],
      ['location', 'สถานที่ตั้งทรัพย์สิน'],
      ['occupancy', 'สถานที่ใช้เป็น'],
      ['periodValue', 'ระยะเวลาเอาประกันภัย'],
      ['propertyInsured', 'ทรัพย์สินที่เอาประกันภัย'],
      ['coverage', 'ความคุ้มครอง'],
      ['liabilityLimit', 'จำกัดวงเงินความรับผิด'],
      ['sumInsured', 'ทุนประกันภัย'],
      ['premium', 'เบี้ยประกันภัยรวม'],
    ];
    const missing = required.find(([key]) => !String(fields[key]).trim());
    if (missing) return setError(`กรุณากรอก "${missing[1]}"`);
    if (fields.constructionClasses.length === 0) return setError('กรุณาเลือกลักษณะสิ่งปลูกสร้างอย่างน้อย 1 ข้อ');
    if (!workflow || !signerStep) return setError('แบบฟอร์มนี้ยังไม่มีขั้นตอนลงนาม กรุณาติดต่อผู้ดูแลระบบ');
    if (!signerId) return setError(`กรุณาเลือก${QUOTATION_SIGNER_TITLE}`);

    const quotation: QuotationData = {
      ...fields,
      // Trimmed, and the number and date are given when it is sent
      insured: fields.insured.trim(),
      project: fields.project.trim(),
      coverage: fields.coverage.trim(),
      exclusions: [...standardExclusions, ...otherExclusions.map(e => e.trim()).filter(Boolean)],
      docNo: '',
      date: '',
    };
    createNewRequest(
      {
        category: form.menuName,
        // A shared form: the request belongs to the requester's own department
        departmentId: currentUser.departmentId,
        workflowId: workflow.id,
        itilCategory: 'service_request',
        formId: form.id,
        amount: Number(fields.premium) || undefined,
        quotation,
        ...(files.length ? { attachments: files } : {}),
      },
      { [signerStep.id]: signerId }
    );
    draft.sent();
    onClose();
  };

  const inputClass =
    'w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-sm text-slate-800 focus:outline-hidden focus:border-red-500';
  const lockedClass =
    'w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-100 text-sm text-slate-600 flex items-center gap-1.5';
  const labelClass = 'block font-semibold text-slate-700 mb-1';
  const required = <span className="text-rose-600">*</span>;
  const nextNo = nextRequestCodeFor(
    form,
    requests.map(r => r.code)
  );

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quotation-title"
    >
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden flex flex-col max-h-[94vh]"
      >
        <div className="px-5 py-4 border-b border-slate-200 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id="quotation-title" className="text-base font-bold text-slate-900">
              {form.menuName}
            </h2>
            <p className="text-xs text-slate-500">
              เลขที่ถัดไป <span className="font-mono text-slate-700">{nextNo}</span>
            </p>
            <DraftNotice savedAt={draft.draft?.savedAt} />
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิด"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6 text-xs">
          <Section n={1} title="ข้อมูลเอกสาร">
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_1.4fr_1fr] gap-3">
              <div>
                <span className={labelClass}>เลขที่</span>
                <p className={lockedClass} title="ระบบออกเลขให้เมื่อส่ง">
                  <Lock className="w-3 h-3 shrink-0" />
                  <span className="truncate">{nextNo}</span>
                </p>
              </div>
              <div>
                <span className={labelClass}>วันที่</span>
                <p className={lockedClass}>
                  <Lock className="w-3 h-3 shrink-0" />
                  <span className="truncate">{longThaiDate(new Date())}</span>
                </p>
              </div>
              <div>
                <span className={labelClass}>ผู้จัดทำ</span>
                <p className={lockedClass}>
                  <Lock className="w-3 h-3 shrink-0" />
                  <span className="truncate">{currentUser.name}</span>
                </p>
              </div>
            </div>
          </Section>

          <Section n={2} title="ข้อมูลการประกันภัย">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="q-type" className={labelClass}>
                  ประเภท {required}
                </label>
                <select
                  id="q-type"
                  value={fields.insuranceType}
                  onChange={e => set('insuranceType', e.target.value)}
                  className={inputClass}
                >
                  {QUOTATION_TYPES.map(t => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="q-insured" className={labelClass}>
                  ผู้เอาประกันภัย {required}
                </label>
                <input
                  id="q-insured"
                  value={fields.insured}
                  onChange={e => set('insured', e.target.value)}
                  placeholder="บริษัท … จำกัด"
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="q-project" className={labelClass}>
                  โครงการ
                </label>
                <input
                  id="q-project"
                  value={fields.project}
                  onChange={e => set('project', e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="q-participants" className={labelClass}>
                  จำนวนผู้เข้าร่วม (ราย)
                </label>
                <input
                  id="q-participants"
                  inputMode="numeric"
                  value={fields.participants}
                  onChange={e => set('participants', e.target.value.replace(/\D/g, ''))}
                  className={inputClass}
                />
              </div>
            </div>
            <div>
              <label htmlFor="q-location" className={labelClass}>
                สถานที่ตั้งทรัพย์สิน {required}
              </label>
              <input
                id="q-location"
                value={fields.location}
                onChange={e => set('location', e.target.value)}
                className={inputClass}
              />
            </div>
            <fieldset>
              <legend className={labelClass}>ลักษณะสิ่งปลูกสร้าง {required}</legend>
              <div className="space-y-1.5">
                {CONSTRUCTION_CLASSES.map(c => (
                  <label key={c.value} className="flex items-center gap-2 text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={fields.constructionClasses.includes(c.value)}
                      onChange={() => toggleClass(c.value)}
                      className="w-3.5 h-3.5 rounded border-slate-300 text-red-600 cursor-pointer"
                    />
                    {c.label}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="q-occupancy" className={labelClass}>
                  สถานที่ใช้เป็น {required}
                </label>
                <input
                  id="q-occupancy"
                  value={fields.occupancy}
                  onChange={e => set('occupancy', e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="q-period" className={labelClass}>
                  ระยะเวลาเอาประกันภัย {required}
                </label>
                <div className="flex gap-2">
                  <input
                    id="q-period"
                    inputMode="numeric"
                    value={fields.periodValue}
                    onChange={e => set('periodValue', e.target.value.replace(/\D/g, ''))}
                    className={`${inputClass} max-w-24`}
                  />
                  <select
                    aria-label="หน่วยระยะเวลา"
                    value={fields.periodUnit}
                    onChange={e => set('periodUnit', e.target.value as Fields['periodUnit'])}
                    className={inputClass}
                  >
                    {QUOTATION_PERIOD_UNITS.map(u => (
                      <option key={u}>{u}</option>
                    ))}
                  </select>
                </div>
                <p className="mt-1 text-[11px] text-slate-400">นับจากวันที่ตกลงเอาประกันภัย</p>
              </div>
            </div>
            <div>
              <label htmlFor="q-property" className={labelClass}>
                ทรัพย์สินที่เอาประกันภัย {required}
              </label>
              <input
                id="q-property"
                value={fields.propertyInsured}
                onChange={e => set('propertyInsured', e.target.value)}
                className={inputClass}
              />
            </div>
          </Section>

          <Section n={3} title="ความคุ้มครอง">
            <div>
              <label htmlFor="q-coverage" className={labelClass}>
                รายการความคุ้มครอง {required}
              </label>
              <textarea
                id="q-coverage"
                rows={5}
                value={fields.coverage}
                onChange={e => set('coverage', e.target.value)}
                className={`${inputClass} leading-relaxed`}
              />
              <p className="mt-1 text-[11px] text-slate-400">บรรทัดละ 1 ข้อ ระบบใส่เลขข้อให้ตอนพิมพ์</p>
            </div>
            <div>
              <label htmlFor="q-limit" className={labelClass}>
                จำกัดวงเงินความรับผิด (บาท) {required}
              </label>
              <input
                id="q-limit"
                inputMode="decimal"
                value={fields.liabilityLimit}
                onChange={e => set('liabilityLimit', amountOnly(e.target.value))}
                className={`${inputClass} max-w-56 text-right`}
              />
              {fields.liabilityLimit && (
                <p className="mt-1 text-[11px] text-slate-500">
                  จะพิมพ์ว่า "ไม่เกิน {formatBaht(fields.liabilityLimit)} บาท ต่อครั้งและตลอดระยะเวลาเอาประกันภัย"
                </p>
              )}
            </div>
            <div>
              <label htmlFor="q-policy" className={labelClass}>
                อ้างอิงเงื่อนไขกรมธรรม์
              </label>
              <textarea
                id="q-policy"
                rows={2}
                value={fields.policyReference}
                onChange={e => set('policyReference', e.target.value)}
                className={inputClass}
              />
            </div>
          </Section>

          <Section n={4} title="เงื่อนไขที่สำคัญ">
            <div>
              <label htmlFor="q-conditions" className={labelClass}>
                เงื่อนไข
              </label>
              <textarea
                id="q-conditions"
                rows={5}
                value={fields.conditions}
                onChange={e => set('conditions', e.target.value)}
                className={`${inputClass} leading-relaxed`}
              />
              <p className="mt-1 text-[11px] text-slate-400">สูตรค่าสินไหมทดแทนพิมพ์ต่อท้ายให้อัตโนมัติ</p>
            </div>
          </Section>

          <Section n={5} title="ทุนและเบี้ยประกันภัย">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="q-sum" className={labelClass}>
                  ทุนประกันภัย (บาท ต่อราย) {required}
                </label>
                <input
                  id="q-sum"
                  inputMode="decimal"
                  value={fields.sumInsured}
                  onChange={e => set('sumInsured', amountOnly(e.target.value))}
                  className={`${inputClass} text-right`}
                />
              </div>
              <div>
                <label htmlFor="q-premium" className={labelClass}>
                  เบี้ยประกันภัยรวม (บาท) {required}
                </label>
                <input
                  id="q-premium"
                  inputMode="decimal"
                  value={fields.premium}
                  onChange={e => set('premium', amountOnly(e.target.value))}
                  className={`${inputClass} text-right`}
                />
              </div>
            </div>
          </Section>

          <Section n={6} title="ข้อยกเว้น">
            <div className="space-y-1.5">
              {STANDARD_EXCLUSIONS.map(clause => (
                <label key={clause} className="flex items-start gap-2 text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={standardExclusions.includes(clause)}
                    onChange={() => toggleExclusion(clause)}
                    className="mt-0.5 w-3.5 h-3.5 rounded border-slate-300 text-red-600 cursor-pointer"
                  />
                  {clause}
                </label>
              ))}
            </div>
            {otherExclusions.map((clause, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  value={clause}
                  onChange={e => setOtherExclusions(prev => prev.map((c, j) => (j === i ? e.target.value : c)))}
                  placeholder="ข้อยกเว้นอื่น"
                  aria-label={`ข้อยกเว้นเพิ่มเติม ${i + 1}`}
                  className={inputClass}
                />
                <button
                  type="button"
                  onClick={() => setOtherExclusions(prev => prev.filter((_, j) => j !== i))}
                  aria-label="ลบข้อยกเว้นนี้"
                  className="p-1.5 text-slate-400 hover:text-red-600 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setOtherExclusions(prev => [...prev, ''])}
              className="inline-flex items-center gap-1 text-red-700 font-semibold hover:text-red-800 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              เพิ่มข้อยกเว้น
            </button>
          </Section>

          <Section n={7} title="หมายเหตุ">
            <div>
              <label htmlFor="q-validity" className={labelClass}>
                ข้อเสนอนี้มีผลบังคับใช้ภายใน (วัน)
              </label>
              <input
                id="q-validity"
                inputMode="numeric"
                value={fields.validityDays}
                onChange={e => set('validityDays', e.target.value.replace(/\D/g, ''))}
                className={`${inputClass} max-w-24`}
              />
              <p className="mt-1 text-[11px] text-slate-400">
                นับจากวันที่ออกข้อเสนอ ข้อสงวนสิทธิ์และรายการเอกสารที่ต้องส่ง พิมพ์ให้อัตโนมัติ
              </p>
            </div>
          </Section>

          <Section n={8} title="เอกสารแนบ">
            <FilePicker id="q-files" files={files} onChange={setFiles} />
          </Section>

          <Section n={9} title={QUOTATION_SIGNER_TITLE}>
            <div>
              <label htmlFor="q-signer" className={labelClass}>
                ผู้ลงนาม {required}
              </label>
              <select
                id="q-signer"
                value={signerId}
                onChange={e => setSignerId(e.target.value)}
                className={inputClass}
              >
                <option value="">— เลือกผู้ลงนาม —</option>
                {signers.map(person => (
                  <option key={person.id} value={person.id}>
                    {person.name} — {person.position}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[11px] text-slate-400">
                ส่งให้คนนี้ลงนาม เมื่อลงนามแล้วตราอนุมัติจะขึ้นในใบเสนอราคาและดาวน์โหลด PDF ได้
              </p>
            </div>
          </Section>

          {error && (
            <p role="alert" className="flex items-center gap-1.5 text-rose-700 font-semibold">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {error}
            </p>
          )}
        </div>

        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 sm:px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            ยกเลิก
          </button>
          <SaveDraftButton onClick={saveDraft} />
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap bg-red-600 hover:bg-red-700 text-white shadow-xs cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            ส่งขออนุมัติ
          </button>
        </div>
      </form>
    </div>
  );
};
