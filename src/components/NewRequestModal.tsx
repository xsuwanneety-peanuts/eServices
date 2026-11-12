import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  X,
  KeyRound,
  Laptop,
  AlertTriangle,
  Rocket,
  Database,
  Paperclip,
  Trash2,
  FileText,
  CheckCircle2,
  ShieldAlert,
} from 'lucide-react';
import {
  ItRequestCategory,
  UrgencyLevel,
  ImpactScope,
  PriorityLevel,
} from '../types';

interface SubMenuOption {
  id: string;
  label: string;
  defaultUrgency: UrgencyLevel;
  defaultImpact: ImpactScope;
  suggestedSubject: string;
  placeholderDetails: string;
}

export const NewRequestModal: React.FC = () => {
  const {
    isNewRequestModalOpen,
    setIsNewRequestModalOpen,
    selectedItRequestCategory,
    setSelectedItRequestCategory,
    workflows,
    createNewRequest,
    currentUser,
    setActiveRequestId,
  } = useApp();

  // 5 IT categories as requested
  const itCategories: {
    key: ItRequestCategory;
    title: string;
    icon: React.ElementType;
    badge: string;
    desc: string;
    workflowId: string;
  }[] = [
    {
      key: 'system_access',
      title: 'ขอสิทธิ์เข้าใช้งานระบบ',
      icon: KeyRound,
      badge: 'Access & IAM',
      desc: 'เปิดสิทธิ์, บัญชีผู้ใช้, VPN',
      workflowId: 'wf-it-access',
    },
    {
      key: 'equipment',
      title: 'ขอเบิกอุปกรณ์',
      icon: Laptop,
      badge: 'Hardware',
      desc: 'โน้ตบุ๊ก, จอภาพ, อุปกรณ์เสริม',
      workflowId: 'wf-it-equipment',
    },
    {
      key: 'incident',
      title: 'แจ้งปัญหาระบบขัดข้อง',
      icon: AlertTriangle,
      badge: 'Incident',
      desc: 'ระบบล่ม, เน็ตหลุด, จอฟ้า',
      workflowId: 'wf-it-incident',
    },
    {
      key: 'development',
      title: 'ขอพัฒนาระบบใหม่',
      icon: Rocket,
      badge: 'Development',
      desc: 'ฟังก์ชันใหม่, แอปพลิเคชัน',
      workflowId: 'wf-it-development',
    },
    {
      key: 'data_report',
      title: 'ขอข้อมูล',
      icon: Database,
      badge: 'Data & BI',
      desc: 'ดึงข้อมูลดิบ, ทำรายงาน BI',
      workflowId: 'wf-it-data',
    },
  ];

  // Thoughtfully designed sub-menus conceived from each of the 5 categories
  const subMenuCatalog: Record<ItRequestCategory, SubMenuOption[]> = {
    system_access: [
      {
        id: 'acc-1',
        label: 'ขอเปิดบัญชีผู้ใช้ใหม่ (Active Directory / Windows Domain / Email องค์กร)',
        defaultUrgency: 'medium',
        defaultImpact: 'individual',
        suggestedSubject: 'ขอเปิดบัญชีผู้ใช้พนักงานใหม่ ฝ่าย...',
        placeholderDetails: 'ระบุชื่อ-นามสกุลพนักงานใหม่, ตำแหน่ง, แผนก, วันที่เริ่มงาน และอีเมลที่ต้องการ...',
      },
      {
        id: 'acc-2',
        label: 'ขอสิทธิ์เข้าใช้งานระบบงานหลัก (Core Insurance / Underwriting / Claims)',
        defaultUrgency: 'high',
        defaultImpact: 'individual',
        suggestedSubject: 'ขอสิทธิ์เข้าใช้งานระบบ Core Insurance สำหรับพิจารณาประกัน',
        placeholderDetails: 'ระบุรหัสพนักงาน, ระดับสิทธิ์ที่ต้องการ (Read / Write / Approver) และเหตุผลความจำเป็น...',
      },
      {
        id: 'acc-3',
        label: 'ขอสิทธิ์เข้าใช้งานระบบ ERP / SAP / บัญชีและการเงิน',
        defaultUrgency: 'medium',
        defaultImpact: 'individual',
        suggestedSubject: 'ขอสิทธิ์การบันทึกข้อมูลในระบบ ERP / บัญชี',
        placeholderDetails: 'ระบุโมดูลที่ต้องการเข้าถึง เช่น AP, AR, GL หรือ Asset Management...',
      },
      {
        id: 'acc-4',
        label: 'ขอสิทธิ์เข้าถึงโฟลเดอร์ส่วนกลาง (Shared Drive / Department File Server)',
        defaultUrgency: 'low',
        defaultImpact: 'department',
        suggestedSubject: 'ขอสิทธิ์เข้าถึงโฟลเดอร์ฝ่าย... บน Shared Drive',
        placeholderDetails: 'ระบุเส้นทาง Path โฟลเดอร์ที่ต้องการเข้าถึง และสิทธิ์ (อ่านอย่างเดียว หรือ แก้ไขได้)...',
      },
      {
        id: 'acc-5',
        label: 'ขอสิทธิ์เชื่อมต่อเครือข่ายระยะไกล VPN (Work from Home)',
        defaultUrgency: 'medium',
        defaultImpact: 'individual',
        suggestedSubject: 'ขอเชื่อมต่อระบบ VPN เพื่อปฏิบัติงานนอกสถานที่ (WFH)',
        placeholderDetails: 'ระบุอุปกรณ์ที่ใช้งาน (โน้ตบุ๊กองค์กร), เลข Serial Number และช่วงเวลาที่ต้องการใช้...',
      },
      {
        id: 'acc-6',
        label: 'ขอสิทธิ์ระดับผู้ดูแลระบบชั่วคราว (Temporary Admin / Database Access)',
        defaultUrgency: 'high',
        defaultImpact: 'department',
        suggestedSubject: 'ขอสิทธิ์ Admin ชั่วคราวเพื่อดำเนินการตรวจสอบระบบ',
        placeholderDetails: 'ระบุเหตุผลความจำเป็นเร่งด่วน, ขอบเขตงาน และระยะเวลาที่ขอเปิดสิทธิ์ (สูงสุด 48 ชม.)...',
      },
      {
        id: 'acc-7',
        label: 'ขอยกเลิกหรือเพิกถอนสิทธิ์การเข้าใช้งานระบบ (Revoke User Access)',
        defaultUrgency: 'medium',
        defaultImpact: 'individual',
        suggestedSubject: 'แจ้งระงับสิทธิ์การใช้งานระบบของพนักงานโอนย้าย/ลาออก',
        placeholderDetails: 'ระบุชื่อพนักงานที่พ้นสภาพ, วันที่มีผล และระบบที่ต้องการให้ตัดสิทธิ์ทั้งหมด...',
      },
    ],

    equipment: [
      {
        id: 'eq-1',
        label: 'ขอเบิกเครื่องคอมพิวเตอร์พกพา (Laptop / Notebook) สำหรับพนักงานใหม่หรือทดแทน',
        defaultUrgency: 'medium',
        defaultImpact: 'individual',
        suggestedSubject: 'ขอเบิก Notebook ประจำตำแหน่งสำหรับพนักงานใหม่',
        placeholderDetails: 'ระบุลักษณะงาน (งานทั่วไป หรือ งานประมวลผลสูง/กราฟิก), ชื่อผู้ใช้งาน และสถานที่ส่งมอบ...',
      },
      {
        id: 'eq-2',
        label: 'ขอเบิกเครื่องคอมพิวเตอร์ตั้งโต๊ะ (PC Desktop) ประจำสำนักงาน',
        defaultUrgency: 'low',
        defaultImpact: 'department',
        suggestedSubject: 'ขอเบิก PC Desktop สำหรับจุดบริการสำนักงาน',
        placeholderDetails: 'ระบุตำแหน่งที่ตั้งโต๊ะทำงาน, จุดเชื่อมต่อสาย LAN และลักษณะโปรแกรมที่ต้องติดตั้ง...',
      },
      {
        id: 'eq-3',
        label: 'ขอเบิกจอภาพแสดงผลเสริม (Second Monitor 24" / 27")',
        defaultUrgency: 'low',
        defaultImpact: 'individual',
        suggestedSubject: 'ขอเบิกจอแสดงผลเสริมขนาด 24 นิ้ว สำหรับงานประมวลผล',
        placeholderDetails: 'ระบุเหตุผลความจำเป็นในการใช้ 2 จอภาพ (เช่น ตรวจสอบเอกสารคู่ขนาน, คีย์ข้อมูลประกัน)...',
      },
      {
        id: 'eq-4',
        label: 'ขอเบิกอุปกรณ์เชื่อมต่อ (Docking Station / สายแปลง HDMI / Type-C Hub)',
        defaultUrgency: 'low',
        defaultImpact: 'individual',
        suggestedSubject: 'ขอเบิกชุดสายแปลงสัญญาณจอภาพ HDMI / Type-C',
        placeholderDetails: 'ระบุรุ่นของโน้ตบุ๊กที่ใช้งาน และพอร์ตที่ต้องการแปลงสัญญาณ...',
      },
      {
        id: 'eq-5',
        label: 'ขอเบิกอุปกรณ์เสริม (Wireless Keyboard & Mouse / หูฟัง Headset ประชุม)',
        defaultUrgency: 'low',
        defaultImpact: 'individual',
        suggestedSubject: 'ขอเบิกชุดคีย์บอร์ด เมาส์ไร้สาย และหูฟังสำหรับประชุม',
        placeholderDetails: 'ระบุสาเหตุที่ขอเบิก เช่น อุปกรณ์เดิมชำรุด หรือจำเป็นต้องใช้ประชุมออนไลน์ประจำ...',
      },
      {
        id: 'eq-6',
        label: 'ขอเบิกโทรศัพท์มือถือองค์กร / ซิมการ์ดประจำตำแหน่ง (Corporate Phone / SIM)',
        defaultUrgency: 'medium',
        defaultImpact: 'individual',
        suggestedSubject: 'ขอเบิกสมาร์ทโฟนและซิมการ์ดสำหรับงานฝ่ายพาณิชย์และพันธมิตร',
        placeholderDetails: 'ระบุสิทธิ์ตามเกณฑ์ตำแหน่งงาน, ลักษณะการโทรติดต่อลูกค้าภายนอก และแพ็กเกจที่ต้องการ...',
      },
      {
        id: 'eq-7',
        label: 'ขอเบิกอุปกรณ์สำรองข้อมูล (Encrypted External SSD / Flash Drive)',
        defaultUrgency: 'low',
        defaultImpact: 'individual',
        suggestedSubject: 'ขอเบิก External SSD เข้ารหัส 1TB สำหรับสำรองข้อมูลงาน',
        placeholderDetails: 'ระบุความจำเป็นในการจัดเก็บข้อมูลออฟไลน์ และยืนยันปฏิบัติตามนโยบายความมั่นคงปลอดภัย...',
      },
    ],

    incident: [
      {
        id: 'inc-1',
        label: 'ระบบงานหลักไม่สามารถเข้าใช้งานได้ / ฐานข้อมูลไม่เชื่อมต่อ (System Down)',
        defaultUrgency: 'critical',
        defaultImpact: 'organization',
        suggestedSubject: 'ระบบ Core Insurance ขัดข้อง ไม่สามารถล็อกอินหรือบันทึกข้อมูลได้',
        placeholderDetails: 'ระบุข้อความ Error Code หรือภาพหน้าจอที่พบ, จำนวนผู้ใช้งานที่ได้รับผลกระทบ...',
      },
      {
        id: 'inc-2',
        label: 'สัญญาณอินเทอร์เน็ต / ระบบสาย LAN / Wi-Fi ในสำนักงานขัดข้อง',
        defaultUrgency: 'high',
        defaultImpact: 'department',
        suggestedSubject: 'สัญญาณเครือข่าย Wi-Fi หลุดบ่อย ไม่สามารถเชื่อมต่อเน็ตได้',
        placeholderDetails: 'ระบุบริเวณชั้น/โซนที่เกิดปัญหา, หมายเลข IP หรือชื่อ SSID ที่เชื่อมต่อ...',
      },
      {
        id: 'inc-3',
        label: 'คอมพิวเตอร์เปิดไม่ติด / เกิดจอฟ้า (Blue Screen) / ฮาร์ดแวร์ขัดข้อง',
        defaultUrgency: 'high',
        defaultImpact: 'individual',
        suggestedSubject: 'คอมพิวเตอร์เกิดจอฟ้า Blue Screen รหัสข้อผิดพลาด...',
        placeholderDetails: 'ระบุหมายเลขเครื่อง (Asset Tag / Computer Name), อาการก่อนเกิดปัญหา...',
      },
      {
        id: 'inc-4',
        label: 'ระบบอีเมลองค์กร / Outlook ส่งหรือรับจดหมายไม่ได้ / ปฏิทินไม่ซิงค์',
        defaultUrgency: 'medium',
        defaultImpact: 'individual',
        suggestedSubject: 'โปรแกรม Microsoft Outlook ส่งอีเมลไม่ออก แจ้งเตือนข้อผิดพลาด',
        placeholderDetails: 'ระบุข้อความแจ้งเตือนที่ปรากฏ หรืออาการที่อีเมลค้างใน Outbox...',
      },
      {
        id: 'inc-5',
        label: 'แจ้งเตือนความปลอดภัย / สงสัยติดมัลแวร์ / ไวรัส / อีเมลหลอกลวง (Phishing)',
        defaultUrgency: 'critical',
        defaultImpact: 'organization',
        suggestedSubject: 'พบอีเมลน่าสงสัย Phishing แนบลิงก์แปลกปลอมในกล่องจดหมาย',
        placeholderDetails: 'ระบุที่อยู่อีเมลผู้ส่ง, หัวข้ออีเมล และแจ้งว่าได้กดลิงก์หรือเปิดไฟล์แนบไปแล้วหรือไม่...',
      },
      {
        id: 'inc-6',
        label: 'เครื่องพิมพ์ส่วนกลาง (Network Printer) หรือสแกนเนอร์ในแผนกใช้งานไม่ได้',
        defaultUrgency: 'medium',
        defaultImpact: 'department',
        suggestedSubject: 'เครื่องพิมพ์แผนกพิมพ์งานไม่ออกและแจ้งข้อความ Paper Jam',
        placeholderDetails: 'ระบุชื่อเครื่องพิมพ์, ที่ตั้ง และอาการ เช่น ไม่ตอบสนอง หรือพิมพ์ตัวอักษรเพี้ยน...',
      },
      {
        id: 'inc-7',
        label: 'การเชื่อมต่อ VPN หลุดบ่อย หรือ ไม่สามารถเชื่อมต่อได้',
        defaultUrgency: 'high',
        defaultImpact: 'individual',
        suggestedSubject: 'การเชื่อมต่อ VPN หลุดบ่อย ทุกๆ 5-10 นาที',
        placeholderDetails: 'ระบุเครือข่ายอินเทอร์เน็ตที่บ้านที่ใช้งาน (True, 3BB, AIS), โปรแกรม VPN client ที่ใช้...',
      },
    ],

    development: [
      {
        id: 'dev-1',
        label: 'ขอพัฒนาฟังก์ชันการทำงานหรือโมดูลใหม่บนระบบเดิม (Feature Enhancement)',
        defaultUrgency: 'medium',
        defaultImpact: 'department',
        suggestedSubject: 'ขอเพิ่มระบบนำเข้าไฟล์ Excel อัตโนมัติในโมดูลเคลม',
        placeholderDetails: 'อธิบายขั้นตอนการทำงานเดิม และรูปแบบฟังก์ชันใหม่ที่ต้องการให้ระบบช่วยประมวลผล...',
      },
      {
        id: 'dev-2',
        label: 'ขอออกแบบและพัฒนาระบบงานสารสนเทศใหม่สำหรับองค์กร (New Application)',
        defaultUrgency: 'medium',
        defaultImpact: 'organization',
        suggestedSubject: 'ขอพัฒนาระบบจองห้องประชุมและยานพาหนะออนไลน์',
        placeholderDetails: 'ระบุวัตถุประสงค์ของโครงการ, ประโยชน์ที่คาดว่าจะได้รับ, ผู้ใช้งานกลุ่มเป้าหมาย...',
      },
      {
        id: 'dev-3',
        label: 'ขอเชื่อมต่อระบบงานระหว่างหน่วยงานหรือพาร์ทเนอร์ภายนอก (API Integration)',
        defaultUrgency: 'high',
        defaultImpact: 'organization',
        suggestedSubject: 'ขอเปิดเชื่อมต่อ REST API กับระบบพันธมิตรทางธุรกิจ',
        placeholderDetails: 'ระบุระบบต้นทางและปลายทาง, มาตรฐานความปลอดภัย, รูปแบบข้อมูล (JSON) และเอกสาร API Spec...',
      },
      {
        id: 'dev-4',
        label: 'ขอปรับปรุงกระบวนการทำงานเป็นระบบอัตโนมัติ (Workflow Automation / RPA)',
        defaultUrgency: 'medium',
        defaultImpact: 'department',
        suggestedSubject: 'ขอพัฒนาระบบดึงข้อมูลจากเอกสาร PDF เข้าสู่ฐานข้อมูลอัตโนมัติ',
        placeholderDetails: 'ระบุงานประจำที่ทำซ้ำๆ ปริมาณเอกสารต่อวัน และจุดที่ต้องการให้บอทหรือสคริปต์ช่วยทำแทน...',
      },
      {
        id: 'dev-5',
        label: 'ขอปรับปรุงหน้าตาและประสบการณ์การใช้งานระบบ (UI/UX Redesign)',
        defaultUrgency: 'low',
        defaultImpact: 'department',
        suggestedSubject: 'ขอปรับปรุงหน้าบันทึกข้อมูลกรมธรรม์ให้ใช้งานสะดวกรวดเร็วขึ้น',
        placeholderDetails: 'ระบุปัญหาที่พบในหน้าจอปัจจุบัน และแนวทางเลย์เอาต์ใหม่ที่ต้องการปรับปรุง...',
      },
      {
        id: 'dev-6',
        label: 'ขอพัฒนาระบบแจ้งเตือนอัตโนมัติผ่านอีเมลหรือ Line Notify',
        defaultUrgency: 'medium',
        defaultImpact: 'department',
        suggestedSubject: 'ขอสร้างระบบส่งแจ้งเตือนสถานะคำขออัตโนมัติผ่าน Line Notify',
        placeholderDetails: 'ระบุเงื่อนไขการส่งแจ้งเตือน (Trigger), ข้อความ และกลุ่มผู้รับการแจ้งเตือน...',
      },
    ],

    data_report: [
      {
        id: 'dat-1',
        label: 'ขอดึงข้อมูลดิบเพื่อการวิเคราะห์และตรวจสอบ (Raw Data Export / Excel)',
        defaultUrgency: 'medium',
        defaultImpact: 'individual',
        suggestedSubject: 'ขอดึงข้อมูลประวัติการทำธุรกรรมย้อนหลัง 1 ปี รูปแบบ Excel',
        placeholderDetails: 'ระบุตารางข้อมูล, ฟิลด์ที่ต้องการ, ช่วงวันที่ (Date Range) และเงื่อนไขการกรอง...',
      },
      {
        id: 'dat-2',
        label: 'ขอสร้าง Dashboard รายงานเชิงลึกและสถิติธุรกิจ (Power BI / Business Dashboard)',
        defaultUrgency: 'medium',
        defaultImpact: 'department',
        suggestedSubject: 'ขอจัดทำ Dashboard แสดงยอดขายและเป้าหมายรายสัปดาห์บน Power BI',
        placeholderDetails: 'ระบุตัวชี้วัด (KPIs) ที่ต้องการแสดงผล, แหล่งข้อมูลต้นทาง และความถี่ในการรีเฟรชข้อมูล...',
      },
      {
        id: 'dat-3',
        label: 'ขอรายงานสรุปผลประกอบการ / ยอดขาย / งานสินไหมประจำเดือน / ไตรมาส',
        defaultUrgency: 'medium',
        defaultImpact: 'department',
        suggestedSubject: 'ขอรายงานสรุปสถิติงานสินไหมทดแทน ประจำไตรมาส',
        placeholderDetails: 'ระบุแผนก, ประเภทการเคลม และรูปแบบตารางสรุปผล...',
      },
      {
        id: 'dat-4',
        label: 'ขอดึงบันทึกประวัติการใช้งานระบบเพื่อการตรวจสอบ (Audit Log & Compliance)',
        defaultUrgency: 'high',
        defaultImpact: 'organization',
        suggestedSubject: 'ขอดึง System Audit Log บันทึกการแก้ไขข้อมูลเพื่อส่งผู้ตรวจสอบ',
        placeholderDetails: 'ระบุระบบ, บัญชีผู้ใช้ที่ต้องการตรวจสอบ, ช่วงวัน-เวลา และเหตุผลการตรวจสอบตามเกณฑ์กำกับ...',
      },
      {
        id: 'dat-5',
        label: 'ขอข้อมูลชุดทดสอบสำหรับระบบใหม่ (Masked Test Data for UAT)',
        defaultUrgency: 'low',
        defaultImpact: 'department',
        suggestedSubject: 'ขอข้อมูลจำลองแบบปิดบังข้อมูลส่วนบุคคล (Masked) สำหรับทดสอบระบบ',
        placeholderDetails: 'ระบุจำนวน Record ที่ต้องการ และฟิลด์ข้อมูลส่วนบุคคลที่ต้องผ่านการ Masking ตาม PDPA...',
      },
      {
        id: 'dat-6',
        label: 'ขอตั้งระบบรายงานข้อมูลอัตโนมัติส่งเข้าอีเมลตามรอบเวลา (Scheduled Report)',
        defaultUrgency: 'low',
        defaultImpact: 'department',
        suggestedSubject: 'ขอตั้งรอบส่งรายงานยอดค้างชำระเข้าอีเมลอัตโนมัติทุกวันจันทร์',
        placeholderDetails: 'ระบุรูปแบบรายงาน, วัน-เวลาที่ต้องการให้ส่ง และรายชื่ออีเมลผู้รับ...',
      },
    ],
  };

  // State
  const activeCategory = selectedItRequestCategory || 'system_access';
  const currentSubOptions = subMenuCatalog[activeCategory] || subMenuCatalog.system_access;

  const [selectedSubOptionId, setSelectedSubOptionId] = useState<string>(currentSubOptions[0].id);
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [urgency, setUrgency] = useState<UrgencyLevel>('medium');
  const [impact, setImpact] = useState<ImpactScope>('department');
  const [assignedTo, setAssignedTo] = useState<string>('ยังไม่มอบหมาย (ส่งเข้าคิวกลางฝ่ายไอที)');
  const [attachments, setAttachments] = useState<{ name: string; size: string; type: string }[]>([]);

  // When activeCategory changes, sync sub-option
  useEffect(() => {
    const defaultOption = currentSubOptions[0];
    if (defaultOption) {
      setSelectedSubOptionId(defaultOption.id);
      if (!title || title.startsWith('ขอ') || title.startsWith('ระบบ') || title.startsWith('โปรแกรม') || title.startsWith('สัญญาณ') || title.startsWith('คอมพิวเตอร์') || title.startsWith('พบ')) {
        setTitle(defaultOption.suggestedSubject);
      }
      setUrgency(defaultOption.defaultUrgency);
      setImpact(defaultOption.defaultImpact);
    }
  }, [activeCategory]);

  const activeSubOption = useMemo(() => {
    return currentSubOptions.find(opt => opt.id === selectedSubOptionId) || currentSubOptions[0];
  }, [currentSubOptions, selectedSubOptionId]);

  // Handle switching sub-option
  const handleSelectSubOption = (optionId: string) => {
    setSelectedSubOptionId(optionId);
    const opt = currentSubOptions.find(o => o.id === optionId);
    if (opt) {
      setTitle(opt.suggestedSubject);
      setUrgency(opt.defaultUrgency);
      setImpact(opt.defaultImpact);
    }
  };

  // Calculate priority automatically based on urgency and impact
  const calculatedPriority: { code: PriorityLevel; label: string; color: string } = useMemo(() => {
    if (urgency === 'critical' || (urgency === 'high' && impact === 'organization')) {
      return { code: 'P1', label: 'P1 - วิกฤต (Critical)', color: 'text-red-700 bg-red-50 border-red-300' };
    }
    if (urgency === 'high' || (urgency === 'medium' && impact === 'organization')) {
      return { code: 'P2', label: 'P2 - สูง (High)', color: 'text-amber-700 bg-amber-50 border-amber-300' };
    }
    if (urgency === 'low' && impact === 'individual') {
      return { code: 'P4', label: 'P4 - ต่ำ (Low)', color: 'text-slate-700 bg-slate-50 border-slate-300' };
    }
    return { code: 'P3', label: 'P3 - ปานกลาง (Medium)', color: 'text-red-700 bg-red-50/60 border-red-200 font-bold' };
  }, [urgency, impact]);

  if (!isNewRequestModalOpen) return null;

  // Find active category item
  const currentCategoryConfig = itCategories.find(c => c.key === activeCategory) || itCategories[0];

  // Map to matching workflow
  const matchedWorkflow = () => {
    const wf = workflows.find(w => w.id === currentCategoryConfig.workflowId);
    return wf || workflows[0];
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('กรุณากรอกหัวเรื่องคำขอ');
      return;
    }

    const wf = matchedWorkflow();
    const created = createNewRequest({
      title: title.trim(),
      category: currentCategoryConfig.title,
      departmentId: 'it',
      itRequestCategory: activeCategory,
      subCategory: activeSubOption?.label || currentSubOptions[0]?.label,
      urgency,
      impact,
      priority: calculatedPriority.code,
      assignedTo,
      details: details.trim() || activeSubOption.placeholderDetails,
      attachments,
      workflowId: wf.id,
    });

    setIsNewRequestModalOpen(false);
    setActiveRequestId(created.id);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between bg-white">
          <div className="flex items-center space-x-2.5">
            <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              สร้างคำขอใหม่
            </h3>
            <span className="text-xs bg-red-50 text-red-700 font-bold px-2.5 py-0.5 rounded-full border border-red-200 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse"></span>
              ฝ่ายเทคโนโลยีสารสนเทศ
            </span>
          </div>

          <button
            onClick={() => setIsNewRequestModalOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            title="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4.5 text-xs sm:text-sm">
          {/* Section 1: ประเภทคำขอ (5 IT Forms replacing ITIL) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-600"></span>
                <span>ประเภทคำขอ</span>
              </label>
              <span className="text-[11px] text-slate-400">
                เลือกแบบฟอร์มฝ่ายไอทีที่ต้องการขอรับบริการ
              </span>
            </div>

            {/* Responsive Grid with all 5 IT Forms in Corporate Red Highlight */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {itCategories.map(cat => {
                const Icon = cat.icon;
                const isSelected = activeCategory === cat.key;

                return (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => {
                      setSelectedItRequestCategory(cat.key);
                    }}
                    className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center justify-between gap-1.5 cursor-pointer relative ${
                      isSelected
                        ? 'border-red-600 bg-red-50/70 text-red-700 font-bold shadow-xs ring-1 ring-red-500/30'
                        : 'border-slate-200 hover:border-red-300 hover:bg-slate-50 bg-white text-slate-700'
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-1.5 right-1.5 text-red-600">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </div>
                    )}
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                        isSelected
                          ? 'bg-red-600 text-white'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold block leading-tight">
                        {cat.title}
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5 font-normal leading-tight">
                        {cat.badge}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: รายการคำขอย่อย / Sub-menu */}
          <div className="bg-slate-50/70 rounded-xl p-3.5 border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <span>รายการคำขอย่อย (Sub-menu ของ {currentCategoryConfig.title})</span>
                <span className="text-red-600">*</span>
              </label>
              <span className="text-[10px] font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                {currentSubOptions.length} ตัวเลือก
              </span>
            </div>

            {/* Dropdown Select for Sub-menu */}
            <select
              value={selectedSubOptionId}
              onChange={e => handleSelectSubOption(e.target.value)}
              className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs sm:text-sm font-medium focus:outline-hidden focus:border-red-500 focus:ring-1 focus:ring-red-500"
            >
              {currentSubOptions.map(opt => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>

            {/* Quick-choice chips for popular sub-items */}
            <div>
              <span className="text-[11px] font-medium text-slate-400 block mb-1.5">
                คลิกเลือกด่วนยอดนิยม:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {currentSubOptions.slice(0, 4).map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleSelectSubOption(opt.id)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] transition-colors cursor-pointer text-left truncate max-w-full ${
                      selectedSubOptionId === opt.id
                        ? 'bg-red-600 text-white font-semibold'
                        : 'bg-white border border-slate-200 text-slate-700 hover:border-red-300 hover:text-red-700'
                    }`}
                  >
                    {opt.label.split('(')[0].trim()}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Section 3: หัวเรื่องคำขอ * */}
          <div>
            <label className="block text-xs font-bold text-slate-900 mb-1.5">
              หัวเรื่องคำขอ <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder={activeSubOption?.suggestedSubject || 'ระบุหัวเรื่องคำขอ เช่น ขอเปิดสิทธิ์เข้าใช้งานระบบ...'}
              className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-800 text-xs sm:text-sm focus:outline-hidden focus:border-red-500 focus:ring-1 focus:ring-red-500"
            />
          </div>

          {/* Section 4: รายละเอียดเพิ่มเติม */}
          <div>
            <label className="block text-xs font-bold text-slate-900 mb-1.5">
              รายละเอียดเพิ่มเติม / เหตุผลความจำเป็น
            </label>
            <textarea
              rows={3}
              value={details}
              onChange={e => setDetails(e.target.value)}
              placeholder={activeSubOption?.placeholderDetails || 'ระบุรายละเอียดเพิ่มเติม, ข้อมูลผู้ใช้งาน, หรือข้อความแจ้งเตือนความผิดพลาด...'}
              className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-800 text-xs sm:text-sm focus:outline-hidden focus:border-red-500 focus:ring-1 focus:ring-red-500"
            />
          </div>

          {/* Section 5: 3-column row: ความเร่งด่วน / ขอบเขตผลกระทบ / ระดับความสำคัญคำนวณอัตโนมัติ */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1.5">ความเร่งด่วน</label>
              <select
                value={urgency}
                onChange={e => setUrgency(e.target.value as UrgencyLevel)}
                className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-800 text-xs sm:text-sm focus:outline-hidden focus:border-red-500"
              >
                <option value="low">ต่ำ (Low - ภายใน 3-5 วัน)</option>
                <option value="medium">ปานกลาง (Medium - ภายใน 24-48 ชม.)</option>
                <option value="high">สูง (High - ภายใน 8 ชม.)</option>
                <option value="critical">วิกฤต (Critical - เร่งด่วนทันที)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1.5">ขอบเขตผลกระทบ</label>
              <select
                value={impact}
                onChange={e => setImpact(e.target.value as ImpactScope)}
                className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-800 text-xs sm:text-sm focus:outline-hidden focus:border-red-500"
              >
                <option value="individual">เฉพาะบุคคล (Individual)</option>
                <option value="department">ระดับแผนก (Department)</option>
                <option value="organization">ทั้งองค์กร (Organization)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1.5">ความสำคัญคำนวณอัตโนมัติ</label>
              <div className={`p-2.5 border rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center ${calculatedPriority.color}`}>
                {calculatedPriority.label}
              </div>
            </div>
          </div>

          {/* Section 6: ผู้รับผิดชอบงาน */}
          <div>
            <label className="block text-xs font-bold text-slate-900 mb-1.5">
              ผู้รับผิดชอบงาน (ฝ่ายเทคโนโลยีสารสนเทศ)
            </label>
            <select
              value={assignedTo}
              onChange={e => setAssignedTo(e.target.value)}
              className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-800 text-xs sm:text-sm focus:outline-hidden focus:border-red-500"
            >
              <option value="ยังไม่มอบหมาย (ส่งเข้าคิวกลางฝ่ายไอที)">
                ยังไม่มอบหมาย (ส่งเข้าคิวกลางฝ่ายไอที - IT Central Queue)
              </option>
              <option value="ธีระพล เอกประเสริฐ (IT Specialist & Support Lead)">
                ธีระพล เอกประเสริฐ (IT Specialist & Support Lead)
              </option>
              <option value="ทีม IT Service Desk & Support (Tier 1)">
                ทีม IT Service Desk & Support (Tier 1)
              </option>
              <option value="ทีม System & Network Administrator (Tier 2)">
                ทีม System & Network Administrator (Tier 2)
              </option>
              <option value="ทีม Core Application & Database Engineer (Tier 3)">
                ทีม Core Application & Database Engineer (Tier 3)
              </option>
              <option value="วิศวกรความมั่นคงปลอดภัยสารสนเทศ (Cybersecurity & Compliance)">
                วิศวกรความมั่นคงปลอดภัยสารสนเทศ (Cybersecurity & Compliance)
              </option>
            </select>
          </div>

          {/* Section 7: Optional Attachments */}
          <div className="pt-1">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                <Paperclip className="w-3.5 h-3.5 text-slate-500" />
                <span>แนบไฟล์หลักฐาน / เอกสารประกอบคำขอ (ถ้ามี)</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  setAttachments(prev => [
                    ...prev,
                    {
                      name: `it_request_attachment_${prev.length + 1}.png`,
                      size: '720 KB',
                      type: 'image/png',
                    },
                  ]);
                }}
                className="text-xs text-red-600 hover:text-red-800 font-bold cursor-pointer"
              >
                + จำลองแนบไฟล์
              </button>
            </div>

            {attachments.length > 0 && (
              <div className="space-y-1.5">
                {attachments.map((file, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                  >
                    <div className="flex items-center space-x-2 truncate">
                      <FileText className="w-4 h-4 text-red-600 shrink-0" />
                      <span className="font-medium text-slate-800 truncate">{file.name}</span>
                      <span className="text-[10px] text-slate-400">({file.size})</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAttachments(attachments.filter((_, idx) => idx !== i))}
                      className="p-1 text-slate-400 hover:text-red-600 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Modal Footer Buttons */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-2.5">
            <button
              type="button"
              onClick={() => setIsNewRequestModalOpen(false)}
              className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-red-600 hover:bg-red-700 text-white shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <span>สร้างคำขอใหม่</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
