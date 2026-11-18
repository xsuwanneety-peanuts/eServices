import { DocumentRequest } from '../types';
import {
  IT_RATING_LABELS,
  durationText,
  stampParts,
  thaiDateTime,
  workDuration,
} from './itRequest';
import { poDate } from './poRequest';

/** One labelled value of a request. Long or multi-line text takes the full width. */
export interface DetailField {
  label: string;
  value: string;
  wide?: boolean;
}

/** A titled group of fields in the request window. */
export interface DetailSection {
  title?: string;
  fields: DetailField[];
}

const URGENCY_LABELS: Record<DocumentRequest['urgency'], string> = {
  low: 'ต่ำ',
  medium: 'ปานกลาง',
  high: 'สูง',
  critical: 'วิกฤต',
};
const IMPACT_LABELS: Record<NonNullable<DocumentRequest['impact']>, string> = {
  individual: 'รายบุคคล',
  department: 'ทั้งแผนก',
  organization: 'ทั้งองค์กร',
};

const isLong = (value: string) => value.includes('\n') || value.length > 60;
const field = (label: string, value: string | undefined, wide?: boolean): DetailField => ({
  label,
  value: value ?? '',
  wide: wide ?? isLong(value ?? ''),
});
/** Drops fields with nothing in them, and sections left with no fields. */
const clean = (sections: DetailSection[]): DetailSection[] =>
  sections
    .map(section => ({ ...section, fields: section.fields.filter(f => f.value.trim()) }))
    .filter(section => section.fields.length > 0);

/**
 * What a request says, grouped for reading: every kind of form (memo, IT & Request Form,
 * department-built forms, the original IT forms) comes out as the same sections of fields.
 */
export const requestDetailSections = (request: DocumentRequest): DetailSection[] => {
  const { memo, itRequest } = request;

  if (memo) {
    return clean([
      {
        fields: [
          field('ที่', memo.docNo),
          field('วันที่', memo.date),
          field('เรียน', memo.to),
          field('จาก', request.requestorName),
          field('เรื่อง', request.title, true),
        ],
      },
      { title: 'สรุปความเป็นมา', fields: [field('', memo.background, true)] },
      { title: 'สรุปสาระสำคัญ', fields: [field('', memo.summary, true)] },
    ]);
  }

  if (itRequest) {
    const { work, acceptance } = itRequest;
    const issued = stampParts(request.createdAt);
    return clean([
      {
        title: '1. ผู้ออกใบสั่งงาน',
        fields: [
          field('ชื่อผู้ร้องขอ', request.requestorName),
          field('ฝ่าย / แผนก', request.requestorDepartment, false),
          field('E-mail', itRequest.userLogin, false),
          field('วันที่ออกใบสั่งงาน', `${issued.date} ${issued.time}`.trim()),
          field('เบอร์โทร', itRequest.phone),
          field('สถานที่', itRequest.location),
          field('ผู้ครอบครองทรัพย์สิน', itRequest.assetHolder),
        ],
      },
      {
        title: 'รายการ',
        fields: [
          ...itRequest.items.map(item =>
            field(item.type, [item.assetNo && `เลขทะเบียน ${item.assetNo}`, item.detail].filter(Boolean).join(' · ') || '✓', true)
          ),
          field('สาเหตุ / อาการ', itRequest.symptom, true),
        ],
      },
      ...(work
        ? [
            {
              title: '2. ผู้รับใบสั่งงาน IT',
              fields: [
                field(
                  'การวินิจฉัย',
                  [work.urgency === 'urgent' ? 'ด่วน' : `รอได้ ${work.waitDays ?? 0} วัน`, ...work.impacts].join(', '),
                  false
                ),
                field('ประมาณการเวลา', durationText(work.estimate)),
                field('การดำเนินการ', [...work.actions, ...work.kinds].join(', '), false),
                field('รวมเวลาดำเนินการเสร็จจริง', durationText(workDuration(work))),
                field('วันที่เริ่ม', thaiDateTime(work.startAt)),
                field('วันที่สิ้นสุด', thaiDateTime(work.endAt)),
                field('สาเหตุ / แนวทางแก้ไข / การดำเนินการ', work.solution, true),
              ],
            },
            {
              title: '3. การส่งมอบงาน',
              fields: [
                field('ค่าใช้จ่าย', work.cost > 0 ? `${work.cost.toLocaleString()} บาท` : 'ไม่มีค่าใช้จ่าย'),
                field('อุปกรณ์ที่ใช้', work.equipmentUsed.join(', '), false),
                field('อ้างอิงใบเบิกเลขที่', work.requisitionNo),
                field('วันที่ใบเบิก', work.requisitionDate ? thaiDateTime(`${work.requisitionDate}T00:00`).split(' ')[0] : ''),
                field('รหัสทรัพย์สินที่ตัดทำลาย', work.disposedAssetNo),
                field('รหัสทรัพย์สินที่ต้องโอนย้าย', work.transferredAssetNo),
              ],
            },
          ]
        : []),
      ...(acceptance
        ? [
            {
              title: 'ประเมินความพึงพอใจ',
              fields: [
                ...IT_RATING_LABELS.map(r => field(r.label, `${acceptance.ratings[r.key]} / 5`, false)),
                field('หมายเหตุ / ข้อเสนอแนะ', acceptance.remark, true),
              ],
            },
          ]
        : []),
    ]);
  }

  if (request.poRequest) {
    const po = request.poRequest;
    return clean([
      {
        fields: [
          field("Client's Reference Number", po.refNo, false),
          field('Date Of Request', po.requestDate, false),
          field('Requested Form (Client Name)', po.clientName),
          field("Requested By (Person's Name)", request.requestorName),
          field('Expected Date Of Completion', poDate(po.expectedDate), false),
          field('Attention To', po.attentionTo, false),
        ],
      },
      {
        title: 'Description Of Request',
        fields: [field('เรียน', po.to, false), field('', po.description, true)],
      },
    ]);
  }

  // A department-built form keeps what was typed as labelled answers
  if (request.answers?.length) {
    return clean([{ fields: request.answers.map(a => field(a.label, a.value)) }]);
  }

  // The original IT forms: a few service-desk fields and free text
  return clean([
    {
      fields: [
        field('ประเภทย่อย', request.subCategory, false),
        ...(request.impact
          ? [
              field('ความเร่งด่วน', URGENCY_LABELS[request.urgency]),
              field('ขอบเขตผลกระทบ', IMPACT_LABELS[request.impact]),
            ]
          : []),
        field('ผู้รับผิดชอบ', request.assignedTo, false),
      ],
    },
    { fields: [field('', request.details, true)] },
  ]);
};
