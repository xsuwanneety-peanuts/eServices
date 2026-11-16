import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { DocumentRequest, ItAcceptance, ItWorkRecord } from '../types';
import {
  IT_ACTIONS,
  IT_IMPACTS,
  IT_KINDS,
  IT_RATING_LABELS,
  IT_RATING_SCALE,
  durationText,
  workDuration,
} from '../utils/itRequest';
import { AlertTriangle, CheckCircle2, ClipboardCheck, Wrench } from 'lucide-react';

const inputClass =
  'w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-sm text-slate-800 focus:outline-hidden focus:border-red-500';
const labelClass = 'block font-semibold text-slate-700 mb-1';

const toggle = (list: string[], value: string) =>
  list.includes(value) ? list.filter(v => v !== value) : [...list, value];

/** Now as a value for a datetime-local input. */
const nowLocal = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const ErrorLine: React.FC<{ message: string }> = ({ message }) =>
  message ? (
    <p role="alert" className="flex items-center gap-1.5 text-rose-700 font-semibold">
      <AlertTriangle className="w-4 h-4 shrink-0" />
      {message}
    </p>
  ) : null;

/** Part 2 (and the hand-over details of part 3): IT records the diagnosis and the work done. */
const ItWorkForm: React.FC<{ request: DocumentRequest; onReturn: () => void }> = ({ request, onReturn }) => {
  const { approveRequest, currentUser } = useApp();
  const [urgency, setUrgency] = useState<ItWorkRecord['urgency']>('can_wait');
  const [waitDays, setWaitDays] = useState('1');
  const [impacts, setImpacts] = useState<string[]>([]);
  const [estimate, setEstimate] = useState({ days: '0', hours: '0', minutes: '0' });
  const [actions, setActions] = useState<string[]>([]);
  const [kinds, setKinds] = useState<string[]>([]);
  const [solution, setSolution] = useState('');
  const [startAt, setStartAt] = useState(nowLocal());
  const [endAt, setEndAt] = useState(nowLocal());
  const [cost, setCost] = useState('0');
  const [equipment, setEquipment] = useState(['', '', '', '']);
  const [requisitionNo, setRequisitionNo] = useState('');
  const [requisitionDate, setRequisitionDate] = useState('');
  const [disposedAssetNo, setDisposedAssetNo] = useState('');
  const [transferredAssetNo, setTransferredAssetNo] = useState('');
  const [error, setError] = useState('');

  const num = (value: string) => Math.max(0, Number(value) || 0);
  const validTimes = !!startAt && !!endAt && new Date(endAt) >= new Date(startAt);

  const handleSave = () => {
    if (!solution.trim()) return setError('กรุณากรอก "สาเหตุ / แนวทางแก้ไข / การดำเนินการ"');
    if (actions.length === 0) return setError('กรุณาเลือกประเภทการดำเนินการอย่างน้อย 1 อย่าง');
    if (!validTimes) return setError('วันที่สิ้นสุดต้องไม่ก่อนวันที่เริ่ม');
    const work: ItWorkRecord = {
      urgency,
      waitDays: urgency === 'can_wait' ? num(waitDays) : undefined,
      impacts,
      estimate: { days: num(estimate.days), hours: num(estimate.hours), minutes: num(estimate.minutes) },
      solution: solution.trim(),
      actions,
      kinds,
      startAt,
      endAt,
      cost: num(cost),
      equipmentUsed: equipment.map(e => e.trim()).filter(Boolean),
      requisitionNo: requisitionNo.trim(),
      requisitionDate,
      disposedAssetNo: disposedAssetNo.trim(),
      transferredAssetNo: transferredAssetNo.trim(),
    };
    approveRequest(request.id, 'ดำเนินการเสร็จ ส่งมอบงานให้ผู้ร้องขอ', { work });
  };

  const check = (label: string, checked: boolean, onChange: () => void, type: 'checkbox' | 'radio' = 'checkbox') => (
    <label key={label} className="inline-flex items-center gap-1.5 text-sm text-slate-800 cursor-pointer">
      <input type={type} checked={checked} onChange={onChange} className="w-4 h-4 accent-red-600" />
      {label}
    </label>
  );

  return (
    <div className="p-4 rounded-xl border-2 border-red-200 bg-red-50/30 space-y-4 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-bold text-red-950 flex items-center gap-1.5">
          <Wrench className="w-4 h-4 text-red-600" />
          2. ส่วนของผู้รับใบสั่งงาน IT
        </span>
        <span className="text-[11px] text-red-800">
          ผู้ดำเนินการ: <strong>{currentUser.name}</strong>
        </span>
      </div>

      <div>
        <p className={labelClass}>การวินิจฉัย</p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {check('ด่วน', urgency === 'urgent', () => setUrgency('urgent'), 'radio')}
          <span className="inline-flex items-center gap-1.5">
            {check('รอได้', urgency === 'can_wait', () => setUrgency('can_wait'), 'radio')}
            <input
              type="number"
              min={0}
              aria-label="รอได้กี่วัน"
              value={waitDays}
              disabled={urgency !== 'can_wait'}
              onChange={e => setWaitDays(e.target.value)}
              className={`${inputClass} w-16 disabled:bg-slate-100`}
            />
            <span className="text-slate-600">วัน</span>
          </span>
          {IT_IMPACTS.map(impact => check(impact, impacts.includes(impact), () => setImpacts(prev => toggle(prev, impact))))}
        </div>
      </div>

      <div>
        <p className={labelClass}>ประมาณการเวลาดำเนินการ</p>
        <div className="flex flex-wrap items-center gap-2 text-slate-600">
          {(
            [
              ['days', 'วัน'],
              ['hours', 'ชม.'],
              ['minutes', 'นาที'],
            ] as const
          ).map(([key, unit]) => (
            <span key={key} className="inline-flex items-center gap-1.5">
              <input
                type="number"
                min={0}
                aria-label={`ประมาณการ ${unit}`}
                value={estimate[key]}
                onChange={e => setEstimate(prev => ({ ...prev, [key]: e.target.value }))}
                className={`${inputClass} w-16`}
              />
              {unit}
            </span>
          ))}
        </div>
      </div>

      <div>
        <p className={labelClass}>
          การดำเนินการ <span className="text-rose-600">*</span>
        </p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {IT_ACTIONS.map(action => check(action, actions.includes(action), () => setActions(prev => toggle(prev, action))))}
          <span className="w-px h-4 bg-slate-300" aria-hidden />
          {IT_KINDS.map(kind => check(kind, kinds.includes(kind), () => setKinds(prev => toggle(prev, kind))))}
        </div>
      </div>

      <div>
        <label htmlFor="itw-solution" className={labelClass}>
          สาเหตุ / แนวทางแก้ไข / การแก้ไข หรือการดำเนินการ <span className="text-rose-600">*</span>
        </label>
        <textarea
          id="itw-solution"
          rows={4}
          value={solution}
          onChange={e => setSolution(e.target.value)}
          className={`${inputClass} leading-relaxed`}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="itw-start" className={labelClass}>
            วันที่และเวลาเริ่ม
          </label>
          <input id="itw-start" type="datetime-local" value={startAt} onChange={e => setStartAt(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label htmlFor="itw-end" className={labelClass}>
            วันที่และเวลาสิ้นสุด
          </label>
          <input id="itw-end" type="datetime-local" value={endAt} onChange={e => setEndAt(e.target.value)} className={inputClass} />
        </div>
        <p className="sm:col-span-2 text-slate-600">
          รวมเวลาดำเนินการเสร็จจริง:{' '}
          <strong>{validTimes ? durationText(workDuration({ startAt, endAt })) : '—'}</strong>
        </p>
      </div>

      <div className="pt-3 border-t border-red-200 space-y-3">
        <p className="font-bold text-red-950">3. ส่วนของการส่งมอบงาน User</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="itw-cost" className={labelClass}>
              ค่าใช้จ่าย (บาท) — ใส่ 0 ถ้าไม่มี
            </label>
            <input id="itw-cost" type="number" min={0} value={cost} onChange={e => setCost(e.target.value)} className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="itw-req-no" className={labelClass}>
                อ้างอิงใบเบิกเลขที่
              </label>
              <input id="itw-req-no" value={requisitionNo} onChange={e => setRequisitionNo(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label htmlFor="itw-req-date" className={labelClass}>
                วันที่ใบเบิก
              </label>
              <input
                id="itw-req-date"
                type="date"
                value={requisitionDate}
                onChange={e => setRequisitionDate(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
        </div>
        <div>
          <p className={labelClass}>อุปกรณ์ที่ใช้</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {equipment.map((value, idx) => (
              <input
                key={idx}
                aria-label={`อุปกรณ์ที่ใช้ ${idx + 1}`}
                value={value}
                onChange={e => setEquipment(prev => prev.map((v, i) => (i === idx ? e.target.value : v)))}
                placeholder={`${idx + 1}.`}
                className={inputClass}
              />
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="itw-disposed" className={labelClass}>
              รหัสทรัพย์สินที่ตัดทำลาย
            </label>
            <input id="itw-disposed" value={disposedAssetNo} onChange={e => setDisposedAssetNo(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label htmlFor="itw-transferred" className={labelClass}>
              รหัสทรัพย์สินที่ต้องโอนย้าย
            </label>
            <input
              id="itw-transferred"
              value={transferredAssetNo}
              onChange={e => setTransferredAssetNo(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
      </div>

      <ErrorLine message={error} />

      <div className="flex flex-col sm:flex-row items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs sm:text-sm shadow-xs flex items-center justify-center gap-2 cursor-pointer"
        >
          <CheckCircle2 className="w-4 h-4" />
          บันทึกผลและส่งมอบงาน
        </button>
        <button
          type="button"
          onClick={onReturn}
          className="w-full sm:w-auto py-2.5 px-4 rounded-xl bg-white hover:bg-rose-50 hover:text-rose-700 text-slate-700 font-semibold text-xs border border-slate-300 cursor-pointer"
        >
          ตีกลับแก้ไข
        </button>
      </div>
    </div>
  );
};

/** The sign-off of part 3: the requester accepts the work and rates the service. */
const ItAcceptanceForm: React.FC<{ request: DocumentRequest }> = ({ request }) => {
  const { approveRequest, currentUser } = useApp();
  const [ratings, setRatings] = useState<Partial<ItAcceptance['ratings']>>({});
  const [remark, setRemark] = useState('');
  const [error, setError] = useState('');

  const handleAccept = () => {
    const missing = IT_RATING_LABELS.find(r => !ratings[r.key]);
    if (missing) return setError(`กรุณาให้คะแนน "${missing.label}"`);
    approveRequest(request.id, 'รับมอบงานแล้ว', {
      acceptance: { ratings: ratings as ItAcceptance['ratings'], remark: remark.trim() },
    });
  };

  return (
    <div className="p-4 rounded-xl border-2 border-red-200 bg-red-50/30 space-y-4 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-bold text-red-950 flex items-center gap-1.5">
          <ClipboardCheck className="w-4 h-4 text-red-600" />
          รับมอบงานและประเมินความพึงพอใจ
        </span>
        <span className="text-[11px] text-red-800">
          ผู้รับมอบงาน: <strong>{currentUser.name}</strong>
        </span>
      </div>
      <p className="text-slate-600">
        ฝ่ายเทคโนโลยีสารสนเทศดำเนินการตามที่ท่านต้องการเรียบร้อยแล้ว กรุณาตรวจสอบและให้คะแนน (5 = ดีมาก, 1 = น้อยมาก)
      </p>

      <div className="space-y-2.5">
        {IT_RATING_LABELS.map(({ key, label }) => (
          <div key={key} className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
            <span className="font-semibold text-slate-700">{label}</span>
            <div className="flex gap-1.5" role="radiogroup" aria-label={label}>
              {[5, 4, 3, 2, 1].map(score => (
                <button
                  key={score}
                  type="button"
                  role="radio"
                  aria-checked={ratings[key] === score}
                  title={IT_RATING_SCALE[score - 1]}
                  onClick={() => setRatings(prev => ({ ...prev, [key]: score }))}
                  className={`w-9 h-8 rounded-lg border text-sm font-bold cursor-pointer transition-colors ${
                    ratings[key] === score
                      ? 'bg-red-600 border-red-600 text-white'
                      : 'bg-white border-slate-300 text-slate-600 hover:border-red-400'
                  }`}
                >
                  {score}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div>
        <label htmlFor="ita-remark" className={labelClass}>
          หมายเหตุ / ข้อเสนอแนะ
        </label>
        <textarea id="ita-remark" rows={2} value={remark} onChange={e => setRemark(e.target.value)} className={inputClass} />
      </div>

      <ErrorLine message={error} />

      <button
        type="button"
        onClick={handleAccept}
        className="w-full py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs sm:text-sm shadow-xs flex items-center justify-center gap-2 cursor-pointer"
      >
        <CheckCircle2 className="w-4 h-4" />
        รับมอบงาน
      </button>
    </div>
  );
};

/** What the person acting on a recording step fills in, in place of the plain approve button. */
export const ItStepPanel: React.FC<{ request: DocumentRequest; onReturn: () => void }> = ({ request, onReturn }) => {
  const task = request.steps[request.currentStepIndex]?.task;
  if (task === 'it_work') return <ItWorkForm request={request} onReturn={onReturn} />;
  if (task === 'acceptance') return <ItAcceptanceForm request={request} />;
  return null;
};
