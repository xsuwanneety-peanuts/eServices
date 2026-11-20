import { DepartmentId, MenuItemPermission, QuotationData, WorkflowDefinition } from '../types';
import { CORPORATE_DEPARTMENTS } from '../data/mockData';

// Insurance quotation (ข้อเสนอการประกันภัย): a built-in shared form anyone may fill in. The
// person filling it in picks the one authorised signer; once signed, the PDF follows the
// company's paper quotation (residential building cover, as on the first sample).
export const QUOTATION_FORM_ID = 'form-insurance-quotation';
export const QUOTATION_WORKFLOW_ID = 'wf-insurance-quotation';
export const QUOTATION_SEED_MARKER = 'seed-quotation-form';
export const QUOTATION_FORM_NAME = 'ข้อเสนอการประกันภัย (Quotation)';
/** Numbers read QUO-<year>-<5 digits> (see requestNumbering in forms.ts). */
export const QUOTATION_DOC_PREFIX = 'QUO';
/** Heading of the signature box and of the approval step. */
export const QUOTATION_SIGNER_TITLE = 'ผู้มีอำนาจลงนาม';

export const QUOTATION_TYPES = ['การประกันภัยบ้านอยู่อาศัย'];
export const QUOTATION_PERIOD_UNITS: QuotationData['periodUnit'][] = ['วัน', 'เดือน', 'ปี'];

/** ลักษณะสิ่งปลูกสร้าง, by construction class. */
export const CONSTRUCTION_CLASSES: { value: number; label: string }[] = [
  { value: 1, label: 'สิ่งปลูกสร้างชั้น 1 (ผนังอาคารคอนกรีตทั้งหลัง)' },
  { value: 2, label: 'สิ่งปลูกสร้างชั้น 2 (ครึ่งตึกครึ่งไม้)' },
  { value: 3, label: 'สิ่งปลูกสร้างชั้น 3 (ไม้ทั้งหลัง)' },
];

/** The standard exclusion clauses, all ticked on a new quotation. */
export const STANDARD_EXCLUSIONS = [
  'เอกสารแนบท้ายว่าด้วยข้อยกเว้นภัยก่อการร้าย',
  'เอกสารแนบท้ายว่าด้วยข้อมูลอิเล็กทรอนิกส์และอินเตอร์เน็ต',
  '(ทสร.001) เอกสารแนบท้ายว่าด้วยข้อจำกัดและข้อยกเว้นเกี่ยวกับมาตรการคว่ำบาตร',
  'เอกสารแนบท้ายว่าด้วยข้อยกเว้นภัยโรคติดต่อ',
  'Pollution and Contamination Clause',
];

export const QUOTATION_DEFAULTS: Omit<QuotationData, 'docNo' | 'date'> = {
  insuranceType: QUOTATION_TYPES[0],
  insured: '',
  project: '',
  participants: '',
  location: 'แจ้งให้ทราบในภายหลัง',
  constructionClasses: [1, 2, 3],
  occupancy: 'บ้านอยู่อาศัย (รหัสภัย 1032)',
  periodValue: '3',
  periodUnit: 'เดือน',
  propertyInsured: 'สิ่งปลูกสร้าง (ไม่รวมฐานราก)',
  coverage: [
    'ไฟไหม้, ฟ้าผ่า, ระเบิด, ภัยจากการเฉี่ยว และหรือการชนของยานพาหนะหรือสัตว์พาหนะ, ภัยจากอากาศยาน และหรือวัตถุที่ตกจากอากาศยาน, ภัยเนื่องจากน้ำ (ไม่รวมน้ำท่วม)',
    'กลุ่มภัยธรรมชาติ (ภัยจากลมพายุ, ภัยจากน้ำท่วม, ภัยจากแผ่นดินไหว หรือภูเขาไฟระเบิด หรือคลื่นใต้น้ำหรือสึนามิ และภัยจากลูกเห็บ)',
  ].join('\n'),
  liabilityLimit: '',
  policyReference:
    'ซึ่งเป็นไปตามเงื่อนไขข้อตกลงคุ้มครองและข้อยกเว้นของกรมธรรม์ประกันภัยอัคคีภัย สำหรับที่อยู่อาศัย',
  conditions:
    'ในกรณีที่เกิดความเสียหายขึ้นแก่ทรัพย์สินที่เอาประกันภัย และปรากฏว่าทรัพย์สินนั้นมีมูลค่าสูงกว่าจำนวนเงินที่ได้เอาประกันภัยไว้ให้ถือว่าผู้เอาประกันภัยเป็นผู้รับประกันภัยเองในส่วนที่ต่างกันและในการคำนวณค่าสินไหมทดแทนผู้เอาประกันภัยต้องรับภาระส่วนเฉลี่ยความเสียหายไปตามส่วนทุกๆ รายการ และหากมีมากกว่าหนึ่งรายการให้แยกพิจารณาเป็นแต่ละรายการโดยบริษัทจะชดใช้ค่าสินไหมทดแทนความเสียหายแต่ละรายการตามหลักการต่อไปนี้',
  sumInsured: '',
  premium: '',
  exclusions: [...STANDARD_EXCLUSIONS],
  validityDays: '30',
};

/** Printed on every quotation after the conditions: how a claim is worked out. */
export const QUOTATION_FORMULA = {
  left: 'ค่าสินไหมทดแทน',
  leftNote: '(ไม่เกินจำนวนเงินเอาประกันภัย)',
  numerator: 'จำนวนเงินเอาประกันภัย  x  มูลค่าความสูญเสียหรือความเสียหาย',
  denominator: 'มูลค่าทรัพย์สิน ณ เวลาเกิดความเสียหาย',
  tail: '- ความเสียหายส่วนแรก',
};

export const QUOTATION_CLOSING = [
  'บริษัทฯ หวังเป็นอย่างยิ่งว่า ข้อเสนอรับประกันภัยดังกล่าวข้างต้น จะได้รับการพิจารณาจากท่านด้วยดี หากมีข้อสงสัยประการใด บริษัทฯ ยินดีเรียนชี้แจงให้ทราบ',
  'จึงเรียนมาเพื่อโปรดพิจารณา',
];

/** หมายเหตุ items after the first (which states how long the offer stands). */
export const QUOTATION_NOTES = [
  'บริษัท ขอสงวนสิทธิ์ในการเปลี่ยนแปลงเงื่อนไขความคุ้มครองและอัตราเบี้ยประกันภัยหากตรวจสอบพบว่าความเสี่ยงภัยไม่เป็นไปตามข้อมูลที่บริษัทฯ ได้รับ',
  'กรณีที่ตกลงทำประกันภัยโปรดส่งเอกสาร ดังนี้',
];
export const QUOTATION_DOCUMENTS: { who: string; items: string[] }[] = [
  {
    who: 'กรณีนิติบุคคล',
    items: [
      'สำเนาหนังสือรับรองนิติบุคคลออกไม่เกิน 6 เดือน และประทับตราพร้อมรับรองสำเนาถูกต้อง',
      'สำเนาบัตรประชาชนของกรรมการผู้มีอำนาจ พร้อมรับรองสำเนาถูกต้อง',
    ],
  },
  { who: 'กรณีบุคคลธรรมดา', items: ['สำเนาบัตรประชาชน พร้อมรับรองสำเนาถูกต้อง'] },
];

/** Printed at the foot of every page, as on the company's letterhead. */
export const COMPANY_LETTERHEAD = {
  nameTh: 'บริษัท เจมาร์ท ประกันภัย จำกัด (มหาชน)',
  nameEn: 'Jaymart Insurance Public Company Limited',
  address: '195/1 อาคาร JMT Office ชั้นที่ 5 ถนนรามคำแหง แขวงราษฎร์พัฒนา เขตสะพานสูง กรุงเทพฯ 10240',
  contact: 'โทรศัพท์: +66 2 099 0555    ทะเบียนเลขที่: 0107556000060',
  web: 'www.jaymartinsurance.co.th',
};

export const QUOTATION_FORM: MenuItemPermission = {
  id: QUOTATION_FORM_ID,
  menuCode: 'QUOTATION',
  menuName: QUOTATION_FORM_NAME,
  category: 'แบบฟอร์มกลาง',
  // Shared form: anyone may fill it in; requests belong to the requester's department
  ownerDepartmentId: 'underwriting',
  description: 'ข้อเสนอการประกันภัยบ้านอยู่อาศัย ส่งให้ผู้มีอำนาจลงนามที่เลือก ดาวน์โหลดเป็น PDF ได้เมื่อลงนามแล้ว',
  template: 'quotation',
  workflowId: QUOTATION_WORKFLOW_ID,
  docPrefix: QUOTATION_DOC_PREFIX,
  allowedDepartments: Object.fromEntries(CORPORATE_DEPARTMENTS.map(d => [d.id, true])) as Record<
    DepartmentId,
    boolean
  >,
};

// The person filling in the form, then the one signer they choose
export const QUOTATION_WORKFLOW: WorkflowDefinition = {
  id: QUOTATION_WORKFLOW_ID,
  formId: QUOTATION_FORM_ID,
  formTitle: QUOTATION_FORM_NAME,
  departmentId: 'underwriting',
  description: 'ข้อเสนอการประกันภัย: ผู้จัดทำ → ผู้มีอำนาจลงนามที่ผู้จัดทำเลือก',
  itilCategory: 'service_request',
  steps: [
    {
      id: `${QUOTATION_WORKFLOW_ID}-requester`,
      stepIndex: 0,
      title: 'ผู้จัดทำ',
      roleName: 'ผู้จัดทำ',
      approverType: 'requester',
      sendEmailNotification: true,
      slaHours: 0,
    },
    {
      id: `${QUOTATION_WORKFLOW_ID}-signer`,
      stepIndex: 1,
      title: QUOTATION_SIGNER_TITLE,
      roleName: QUOTATION_SIGNER_TITLE,
      approverType: 'requester_picks',
      sendEmailNotification: true,
      slaHours: 24,
    },
  ],
};

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];
/** Long Thai date as on the quotation, e.g. 10 กรกฎาคม พ.ศ. 2569. */
export const longThaiDate = (date: Date): string =>
  `${date.getDate()} ${THAI_MONTHS[date.getMonth()]} พ.ศ. ${date.getFullYear() + 543}`;

/** Digits typed as an amount, shown as 20,000.00 (empty stays empty). */
export const formatBaht = (value: string): string => {
  const n = Number(String(value).replace(/,/g, ''));
  return value && Number.isFinite(n)
    ? n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : value;
};
/** A count typed as digits, shown as 20,000. */
export const formatCount = (value: string): string => {
  const n = Number(String(value).replace(/,/g, ''));
  return value && Number.isFinite(n) ? n.toLocaleString('en-US') : value;
};

export const quotationPeriod = (q: QuotationData) =>
  `${q.periodValue} ${q.periodUnit} (นับจากวันที่ตกลงเอาประกันภัย)`;

export const constructionLines = (q: QuotationData): string[] =>
  CONSTRUCTION_CLASSES.filter(c => q.constructionClasses.includes(c.value)).map(c => c.label);

/** The request title: who is insured and, when given, the project. */
export const quotationTitle = (q: Pick<QuotationData, 'insured' | 'project'>) =>
  `ข้อเสนอการประกันภัย ${q.insured}${q.project ? ` (${q.project})` : ''}`;

/** The quotation as the label/value list shown in the request window and email previews. */
export const quotationAnswers = (q: QuotationData): { label: string; value: string }[] => [
  { label: 'เลขที่', value: q.docNo },
  { label: 'ประเภท', value: q.insuranceType },
  { label: 'ผู้เอาประกันภัย', value: q.insured },
  { label: 'โครงการ', value: q.project },
  { label: 'จำนวนผู้เข้าร่วม', value: q.participants ? `${formatCount(q.participants)} ราย` : '' },
  { label: 'ทุนประกันภัย', value: q.sumInsured ? `${formatBaht(q.sumInsured)} บาท ต่อราย` : '' },
  { label: 'เบี้ยประกันภัยรวม', value: q.premium ? `${formatBaht(q.premium)} บาท` : '' },
  { label: 'ระยะเวลาเอาประกันภัย', value: quotationPeriod(q) },
];

export const quotationDetails = (q: QuotationData): string =>
  quotationAnswers(q)
    .filter(a => a.value)
    .map(a => `${a.label}: ${a.value}`)
    .join('\n');
