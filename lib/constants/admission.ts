export const NON_SMIV_VALUE = "ไม่เข้าข่าย SMI-V";

export const SUBSTANCE_USE_OPTIONS = ["ไม่ใช้", "ใช้"] as const;
export const SUBSTANCE_TYPE_OPTIONS = [
  "ใช้ยาเสพติด",
  "ใช้สุรา",
  "ใช้ทั้งสารเสพติดและสุรา",
] as const;
export const YES_NO_OPTIONS = ["ใช่", "ไม่ใช่"] as const;
export const RESIDENCE_TYPE_OPTIONS = [
  "เร่ร่อน/อยู่สถานสงเคราะห์",
  "มีที่อยู่เป็นหลักแหล่ง",
] as const;
export const RESIDENCE_DISTRICT_OPTIONS = [
  "ในเขตอำเภอเมืองชลบุรี",
  "นอกเขตอำเภอเมืองชลบุรี",
  "นอกจังหวัด",
] as const;
export const CITY_SUBDISTRICTS = [
  "บางทราย",
  "บางปลาสร้อย",
  "บ้านโขด",
  "มะขามหย่ง",
  "บ้านสวน",
  "หนองรี",
  "หนองข้างคอก",
  "นาป่า",
  "ดอนหัวฬ่อ",
  "หนองไม้แดง",
  "คลองตำหรุ",
  "เสม็ด",
  "ห้วยกะปิ",
  "บ้านปึก",
  "อ่างศิลา",
  "แสนสุข",
  "เหมือง",
  "สำนักบก",
] as const;
export const OTHER_DISTRICTS = [
  "พนัสนิคม",
  "พานทอง",
  "บ้านบึง",
  "ศรีราชา",
  "บางละมุง",
  "สัตหีบ",
  "หนองใหญ่",
  "บ่อทอง",
  "เกาะจันทร์",
  "เกาะสีชัง",
] as const;
export const CAREGIVER_STATUS_OPTIONS = [
  "มีผู้ดูแลหลัก",
  "มีผู้ดูแลแต่ไม่ได้อยู่ด้วยกัน",
  "อยู่คนเดียว",
] as const;
export const CAREGIVER_RELATION_OPTIONS = [
  "บิดามารดา",
  "คู่สมรส",
  "พี่น้อง",
  "ญาติ",
  "บุตร",
  "อื่นๆ",
] as const;
export const DIAGNOSIS_OPTIONS = [
  "Schizophrenia",
  "Schizophrenia Paranoid",
  "Substance Induce Psychosis",
  "Alcohol",
  "Acute Psychosis",
  "Depressive",
  "Adjustment",
  "Bipolar",
  "Suicidal Attempt",
  "Psychotic Disorder",
  "Amphetamine Induce Psychosis",
  "อื่นๆ",
] as const;
export const ADMISSION_SOURCE_OPTIONS = [
  "รับจาก ER",
  "รับจาก OPD",
  "รับย้าย",
  "Refer Fasttrack",
] as const;
export const ADMITTING_DOCTOR_OPTIONS = [
  "พญ. บุญพร้อม เชษฐรตานนท์",
  "พญ. ปฏิมาภรณ์ ผลบุณยรักษ์",
  "พญ. อารียา สมบูรณ์เกื้อ",
  "นพ. แสนพล บุญชัย",
  "พญ. หทัยภัทร วิทยศักดิ์พันธุ์",
  "พญ. อนัญญา ชัยวัฒนพงศ์",
  "นพ.พูร์ ชีวะสุทโธ",
] as const;

export const SMI_V_OPTIONS = [
  {
    value: "SMI-V 1",
    title: "รุนแรงต่อตนเอง",
    description: "มีประวัติทำร้ายตนเองด้วยวิธีที่รุนแรง มีเจตนาหรือมุ่งหวังให้เสียชีวิต",
  },
  {
    value: "SMI-V 2",
    title: "รุนแรงต่อผู้อื่น/สังคม",
    description: "มีประวัติทำร้ายตนเองด้วยวิธีที่รุนแรง/ก่อเหตุรุนแรงทำให้หวาดกลัว สะเทือนขวัญในชุมชน",
  },
  {
    value: "SMI-V 3",
    title: "มีอาการทางจิตและคิดมุ่งร้ายเฉพาะเจาะจง",
    description: "มีอาการหลงผิด หรือมีความคิดทำร้ายตนเอง/ผู้อื่นให้ถึงแก่ชีวิต หรือมุ่งร้ายบุคคลแบบเฉพาะเจาะจง",
  },
  {
    value: "SMI-V 4",
    title: "ก่อคดีอาชญากรรมรุนแรง",
    description: "เคยมีประวัติก่อคดีอาญารุนแรง เช่น ฆ่า พยายามฆ่า ข่มขืน หรือวางเพลิง",
  },
  {
    value: NON_SMIV_VALUE,
    title: "ไม่มีอาการเข้าข่าย SMI-V",
    description: "ไม่พบประวัติหรืออาการตามเกณฑ์ SMI-V 1–4",
  },
] as const;

export const OAS_OPTIONS = [
  {
    value: "1",
    title: "กึ่งเร่งด่วน (Semi-urgency)",
    self: "ไม่พบพฤติกรรมทำร้ายตนเอง",
    others: "หงุดหงิด ส่งเสียงดังหรือตะโกนด้วยความโกรธ หรือตะโกนด่าผู้อื่นด้วยถ้อยคำไม่รุนแรง",
    property: "ปิดประตูเสียงดัง หรือรื้อข้าวของกระจัดกระจาย",
  },
  {
    value: "2",
    title: "เร่งด่วน (Urgency)",
    self: "ขีดข่วนผิวหนัง ตีตนเอง ดึงผม หรือโขกศีรษะตนเองเป็นรอยขนาดเล็ก",
    others: "ด่าคำหยาบรุนแรง แสดงท่าทางคุกคาม พุ่งชน เตะ ผลัก หรือดึงผมผู้อื่นแต่ไม่ได้รับบาดเจ็บ",
    property: "ขว้าง เตะ หรือทุบวัตถุและสิ่งของ",
  },
  {
    value: "3",
    title: "ฉุกเฉิน (Emergency)",
    self: "ทำร้ายตนเองรุนแรง เช่น มีรอยช้ำ รอยกรีดลึก เลือดออก บาดเจ็บอวัยวะภายใน หรือหมดสติ",
    others: "ข่มขู่จะทำร้ายอย่างชัดเจน หรือทำร้ายผู้อื่นจนช้ำ บวม มีบาดแผล กระดูกหัก บาดเจ็บอวัยวะภายใน หรือหมดสติ",
    property: "ทำสิ่งของแตกหัก เช่น ทุบกระจก ขว้างแก้ว จาน มีดหรือสิ่งของอันตราย หรือจุดไฟเผา",
  },
] as const;

export const OAS_CARE_CONTENT: Record<string, { title: string; items: string[] }> = {
  "1": {
    title: "OAS 1 - Semi-urgency (ต้องได้รับการดูแลภายใน 24 ชั่วโมง)",
    items: ["พูดคุยสร้างสัมพันธภาพ", "เปิดโอกาสให้ผู้ป่วยพูดคุยและระบายความรู้สึก", "Verbal restraint", "ประเมินซ้ำ"],
  },
  "2": {
    title: "OAS 2 - Urgency (ต้องได้รับการดูแลภายใน 2 ชั่วโมง)",
    items: ["จัดสิ่งแวดล้อม/พูดคุยสร้างสัมพันธภาพ", "Verbal restraint", "Physical restraint", "ให้ยา Hadol (5) IM / Valium (10) IV (ตามแผนการรักษาชองแพทย์)", "ประเมินซ้ำหลังได้ยา หากอาการไม่ดีขึ้น renotify แพทย์", "ประเมินต่อเนื่องทุก 4-6 ชั่วโมง"],
  },
  "3": {
    title: "OAS 3 - Emergency (ต้องได้รับการดูแลทันทีหรือภายใน 1 ชั่วโมง)",
    items: ["จัดสิ่งแวดล้อมให้ปลอดภัย อยู่ใกล้เคาท์เตอร์พยาบาล", "Physical restraint", "Verbal restraint", "ให้ยา Hadol (5) IM / Valium (10) IV (ตามแผนการรักษาชองแพทย์)", "ประเมินซ้ำหลังได้ยา หากอาการไม่ดีขึ้น renotify แพทย์", "ประเมินต่อเนื่องทุก 4-6 ชั่วโมง"],
  },
};
