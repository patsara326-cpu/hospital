// ==========================================
// 1. กำหนดค่าการเชื่อมต่อ Supabase
// ==========================================
const supabaseUrl = 'https://romunshyuniemwauqydu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJvbXVuc2h5dW5pZW13YXVxeWR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4NzMyMDcsImV4cCI6MjA5NTQ0OTIwN30.YbgiZ9WVKJoFPVm8D0kND6Wbpg08JApNCCwBcQgLQjo';
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

// ตัวแปรส่วนกลางสำหรับเก็บข้อมูลผู้ป่วยชั่วคราวในการประเมินรายเวร
let fetchedPatientsCache = [];
// currently selected patient for discharge workflow
let currentDischargePatient = null;
// track where sv_page4 should return to (either 'sv_page2' or 'sv_page3')
let sv4ReturnTo = 'sv_page3';
// track where sv_page5 should return to (either 'sv_page4' or 'sv_page2')
let sv5ReturnTo = null;
// currently selected assessment for edit workflow
let currentEditAssessment = null;

// Register modal removed — no global fallback needed

// ==========================================
// 2. ระบบเข้าสู่ระบบ & สมัครสมาชิก (Auth)
// ==========================================
window.addEventListener('DOMContentLoaded', async () => {
  // Initialize static listeners for pages moved into index.html
  try {
    initStaticListeners();
  } catch (e) {
    console.error('initStaticListeners error', e);
  }

  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session) {
    document.getElementById('loginPage').style.display = 'none';
    document.getElementById('appPage').style.display = 'block';
    await showLoggedInUser();
    showPage('home'); // ลิงก์มาที่หน้าหลักเลยเมื่อเข้าสู่ระบบแล้ว
  }

});

document.addEventListener("DOMContentLoaded", function() {
  const menuToggle = document.getElementById('menu-click-toggle');

  // 1. Scrim element (เพิ่ม div ทับจอเมื่อเปิดเมนู)
  const scrim = document.createElement('div');
  scrim.className = 'menu-scrim';
  document.body.appendChild(scrim);

  // 2. ฟังก์ชันเปิด/ปิดเมนู
  function syncMenuState() {
    if (menuToggle.checked) {
      document.body.classList.add('mobile-menu-open');
    } else {
      document.body.classList.remove('mobile-menu-open');
    }
  }

  menuToggle.addEventListener('change', syncMenuState);

  // กดที่ scrim ให้ปิดเมนู
  scrim.addEventListener('click', () => {
    menuToggle.checked = false;
    syncMenuState();
  });

  // 3. คลิกที่เมนูไอเทมใดๆ → ปิด drawer
  const menuItems = document.querySelectorAll('.nav-menu > .nav-item > .dropdown > div:not(.dropdown-sub)');
  menuItems.forEach(item => {
    item.addEventListener('click', () => {
      if (menuToggle && window.innerWidth <= 768) {
        menuToggle.checked = false;
        syncMenuState();
      }
    });
  });

    // Toggle first-level dropdown on mobile
  document.querySelectorAll('.nav-menu > .nav-item').forEach(navItem => {
    if (navItem.querySelector('.dropdown')) {
      navItem.addEventListener('click', function(e) {
        if (window.innerWidth <= 768) {
          // ถ้าคลิกที่ตัวเอง (ไม่ใช่ dropdown item ย่อย) → toggle dropdown
          if (!e.target.closest('.dropdown')) {
            e.stopPropagation();
            navItem.classList.toggle('dropdown-open');
          }
        }
      });
    }
  });

  // Toggle second-level dropdown-sub on mobile
  document.querySelectorAll('.dropdown-sub').forEach(sub => {
    sub.addEventListener('click', function(e) {
      if (window.innerWidth <= 768) {
        e.stopPropagation();
        sub.classList.toggle('sub-open');
      }
    });
  });
});

async function login() {
  const usernameInput = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;

  if (!usernameInput || !password) { 
    toast('กรุณากรอก Username และ Password', true); 
    return; 
  }

  // แปลง Username เป็น Email ปลอมเพื่อหลอกระบบ Supabase Auth
  const fakeEmail = `${usernameInput}@app.local`;
  const btn = document.querySelector('.login-box .btn');
  const originalText = btn.textContent;
  btn.textContent = 'กำลังเข้าสู่ระบบ...';
  
  const { data, error } = await supabaseClient.auth.signInWithPassword({ 
    email: fakeEmail, 
    password: password 
  });
  
  btn.textContent = originalText;

  if (error) {
    if (error.message.includes("Invalid login credentials")) {
      toast('Username หรือ Password ไม่ถูกต้อง', true);
    } else {
      toast('เข้าสู่ระบบล้มเหลว: ' + error.message, true);
    }
  } else {
    document.getElementById('loginPage').style.display = 'none';
    document.getElementById('appPage').style.display = 'block';
    await showLoggedInUser();
    showPage('home'); // ลิงก์มาที่หน้าหลักเลยเมื่อเข้าสู่ระบบแล้ว
    toast('เข้าสู่ระบบสำเร็จ');
  }
}

async function showLoggedInUser() {
  try {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return;
    
    const username = (user.email || '').split('@')[0];
    
    // ดึงข้อมูลจากตาราง users
    const { data: profiles } = await supabaseClient.from('users').select('*').eq('username', username).limit(1);
    const profile = (profiles && profiles[0]) || null;

    const userBtn = document.getElementById('userMenuBtn');
    const ddUsername = document.getElementById('dd-username');
    const ddName = document.getElementById('dd-name');
    const userDropdown = document.getElementById('userDropdown');

    if (profile) {
      const fullName = `${profile.prefix}${profile.first_name} ${profile.last_name}`;
      
      // ปุ่ม Navbar ด้านบน
      userBtn.innerHTML = `${fullName} <span style="font-size:10px;">▼</span>`;
      
      // ข้อมูลใน Dropdown
      ddUsername.textContent = `${profile.username}`;
      ddName.textContent = fullName;
    } else {
      userBtn.innerHTML = `${username} <span style="font-size:10px;">▼</span>`;
      ddUsername.textContent = `${username}`;
      ddName.textContent = '';
    }

    userBtn.style.display = 'inline-flex';
    
    document.querySelectorAll('.logout-btn').forEach(b => { 
      if (b.id !== 'userMenuBtn') b.style.display = 'none'; 
    });

    if (userDropdown) userDropdown.style.display = 'none';
  } catch (e) {
    console.error('showLoggedInUser error', e);
  }
}

// legacy register removed

// modal registration handlers removed

function logoutFromMenu() {
  // reuse logout then clear UI
  logout();
  const userBtn = document.getElementById('userMenuBtn');
  if (userBtn) userBtn.style.display = 'none';
  const userDropdown = document.getElementById('userDropdown');
  if (userDropdown) userDropdown.style.display = 'none';
}

async function logout() {
  await supabaseClient.auth.signOut();
  document.getElementById('loginPage').style.display = 'flex';
  document.getElementById('appPage').style.display = 'none';
  document.getElementById('username').value = '';
  document.getElementById('password').value = '';
}

// ==========================================
// 3. ควบคุมหน้าจอ (UI Navigation)
// ==========================================
function showPage(page) {
  const pages = ['home','dashboard-2','dashboard-3','newPatient','editPatient','smiv','assessment','result','oldPatient','ior','ipdMale','ipdFemale','male-admission','female-admission','male-discharge','female-discharge','incident-statistics'];
  pages.forEach(p => {
    const el = document.getElementById(`page-${p}`);
    if (!el) return;
    if (p === page) el.classList.remove('hidden'); else el.classList.add('hidden');
  });

  // If displaying assessment, ensure date and scales are prepared
  if (page === 'assessment') {
    const aDate = document.getElementById('a-date');
    if (aDate) aDate.value = new Date().toISOString().split('T')[0];
    if (document.getElementById('phua-items')) buildScaleTable('phua-items', 'phua', PHUA_ITEMS);
    if (document.getElementById('ghard-items')) buildScaleTable('ghard-items', 'ghard', GHARD_ITEMS);
  }

  // When showing home (dashboard), initialize dashboard and start auto-advance timer
  if (page === 'home') {
    try { initDashboard(); } catch (e) { console.error('initDashboard error', e); }
  } else {
    // stop any dashboard auto-advance when leaving home
    stopDashboardAutoAdvance();
  }

  // If showing dashboard page 2, initialize that page (per-doctor cards)
  if (page === 'dashboard-2') {
    try { initDashboard2(); } catch (e) { console.error('initDashboard2 error', e); }
  }

  if (page === 'dashboard-3') {
    try { initDashboard3(); } catch (e) { console.error('initDashboard3 error', e); }
  }

  if (page === 'ior') {
  initIorPage();
  }

  if (page === 'ipdMale') {
  resetIpdPage('male');
  }

  if (page === 'ipdFemale') {
  resetIpdPage('female');
  }

  if (page === 'male-admission' && admissionData.male.length === 0) {
  initAdmissionPage('male');
  }

  if (page === 'female-admission' && admissionData.female.length === 0) {
  initAdmissionPage('female');
  }

  if (page === 'male-discharge' && dischargeData.male.length === 0) {
  initDischargePage('male');
  }

  if (page === 'female-discharge' && dischargeData.female.length === 0) {
  initDischargePage('female');
  }

  if (page === 'incident-statistics' && incidentStatData.length === 0) {
  initIncidentStatistics();
  }
}

// ==========================================
// IOR Page
// ==========================================
function initIorPage() {
  // reset form
  document.getElementById('ior-hn').value = '';
  document.getElementById('ior-patient-info').style.display = 'none';
  document.getElementById('ior-form-section').style.display = 'none';
  document.getElementById('ior-date-raw').value = '';
  document.getElementById('ior-date-display').value = '';
  document.querySelectorAll('input[name="ior-behavior"]').forEach(c => c.checked = false);
  document.querySelectorAll('input[name="ior-level"]').forEach(r => r.checked = false);
  const msg = document.getElementById('ior-msg');
  msg.style.display = 'none'; msg.textContent = '';

  // วันที่ date display
  const rawDate = document.getElementById('ior-date-raw');
  const dispDate = document.getElementById('ior-date-display');
  rawDate.addEventListener('change', function() {
    if (!this.value) { dispDate.value = ''; return; }
    const [y, m, d] = this.value.split('-');
    dispDate.value = `${d}/${m}/${parseInt(y) + 543}`;
  });

  // ค้นหา HN
  const searchBtn = document.getElementById('ior-search-btn');
  // remove old listener by cloning
  const newBtn = searchBtn.cloneNode(true);
  searchBtn.parentNode.replaceChild(newBtn, searchBtn);
  newBtn.addEventListener('click', searchIorPatient);

  document.getElementById('ior-hn').addEventListener('keydown', e => {
    if (e.key === 'Enter') searchIorPatient();
  });

  // ปุ่มบันทึก
  const saveBtn = document.getElementById('ior-save-btn');
  const newSave = saveBtn.cloneNode(true);
  saveBtn.parentNode.replaceChild(newSave, saveBtn);
  newSave.addEventListener('click', saveIorRecord);
}

async function searchIorPatient() {
  const hn = document.getElementById('ior-hn').value.trim();
  if (!hn) { toast('กรุณากรอกรหัส HN', true); return; }

  const { data, error } = await supabaseClient
    .from('patients')
    .select('hn, prefix, full_name')
    .eq('hn', hn)
    .limit(1);

  if (error || !data || data.length === 0) {
    document.getElementById('ior-patient-info').style.display = 'none';
    document.getElementById('ior-form-section').style.display = 'none';
    toast('ไม่พบผู้ป่วยรหัส HN: ' + hn, true);
    return;
  }

  const pt = data[0];
  document.getElementById('ior-patient-name').textContent =
    `HN: ${pt.hn}  |  ${pt.prefix || ''}${pt.full_name}`;
  document.getElementById('ior-patient-info').style.display = 'block';
  document.getElementById('ior-form-section').style.display = 'block';
}

async function saveIorRecord() {
  const hn = document.getElementById('ior-hn').value.trim();
  const recordDate = document.getElementById('ior-date-raw').value;

  if (!hn || !recordDate) {
    toast('กรุณาค้นหาผู้ป่วยและเลือกวันที่', true); return;
  }

  const behaviors = Array.from(
    document.querySelectorAll('input[name="ior-behavior"]:checked')
  ).map(c => c.value);

  const levelEl = document.querySelector('input[name="ior-level"]:checked');
  const level = levelEl ? levelEl.value : null;

  if (behaviors.length === 0) {
    toast('กรุณาเลือกพฤติกรรมรุนแรงอย่างน้อย 1 รายการ', true); return;
  }
  if (!level) {
    toast('กรุณาเลือก Level', true); return;
  }

  const saveBtn = document.getElementById('ior-save-btn');
  saveBtn.disabled = true;
  saveBtn.textContent = 'กำลังบันทึก...';

  const { error } = await supabaseClient.from('ior_records').insert({
    hn,
    record_date: recordDate,
    behaviors,
    level
  });

  saveBtn.disabled = false;
  saveBtn.textContent = 'บันทึกข้อมูล';

  const msg = document.getElementById('ior-msg');
  if (error) {
    msg.style.display = 'block';
    msg.style.color = '#b91c1c';
    msg.textContent = 'เกิดข้อผิดพลาด: ' + error.message;
    toast('บันทึกไม่สำเร็จ', true);
  } else {
    msg.style.display = 'block';
    msg.style.color = '#16a34a';
    msg.textContent = '✅ บันทึกข้อมูลสำเร็จ';
    toast('บันทึก IOR สำเร็จ');
    // reset form หลังบันทึก
    setTimeout(() => {
      document.getElementById('ior-form-section').style.display = 'none';
      document.getElementById('ior-patient-info').style.display = 'none';
      document.getElementById('ior-hn').value = '';
      document.querySelectorAll('input[name="ior-behavior"]').forEach(c => c.checked = false);
      document.querySelectorAll('input[name="ior-level"]').forEach(r => r.checked = false);
      document.getElementById('ior-date-raw').value = '';
      document.getElementById('ior-date-display').value = '';
      msg.style.display = 'none';
    }, 2000);
  }
}

// ==========================================
// IPD Pages (ชาย / หญิง)
// ==========================================

const IPD_LABEL_MAP = {
  hn: 'HN',
  first_name: 'ชื่อ',
  last_name: 'นามสกุล',
  gender: 'เพศ',
  age: 'อายุ',
  smi_v_result: 'ผล SMI-V',
  admission_date: 'วันที่รับ',
  admitting_doctor: 'แพทย์',
  diagnosis: 'การวินิจฉัย',
  substance_use: 'การใช้สารเสพติด',
  substance_type: 'ประเภทสารเสพติด',
  admission_source: 'แหล่งที่รับ',
  oas_score: 'OAS Score',
  oas_risk_level: 'OAS Risk Level',
  aggressive_behavior: 'พฤติกรรมก้าวร้าว',
  residence_type: 'ประเภทที่อยู่',
  residence_district: 'อำเภอ',
  residence_subdistrict: 'ตำบล',
  residence_details: 'ที่อยู่รายละเอียด',
  caregiver_status: 'สถานะผู้ดูแล',
  caregiver_name: 'ชื่อผู้ดูแล',
  caregiver_relation: 'ความสัมพันธ์',
  caregiver_phone: 'เบอร์ผู้ดูแล',
  patient_phone: 'เบอร์ผู้ป่วย',
  is_smi_v: 'เข้าข่าย SMI-V',
};

// track active tab per gender
const ipdActiveTab = { male: null, female: null };

function resetIpdPage(gender) {
  const listEl = document.getElementById(`ipd-${gender}-list`);
  listEl.style.display = 'none';
  listEl.innerHTML = '';
  ipdActiveTab[gender] = null;
  // reset button colors
  document.getElementById(`ipd-${gender}-btn-nonsmiv`).style.background = '#6366f1';
  document.getElementById(`ipd-${gender}-btn-smiv`).style.background = '#94a3b8';
}

async function loadIpdList(gender, tab) {
  const genderLabel = gender === 'male' ? 'ชาย' : 'หญิง';
  const listEl = document.getElementById(`ipd-${gender}-list`);

  // toggle ถ้าคลิก tab เดิม
  if (ipdActiveTab[gender] === tab) {
    ipdActiveTab[gender] = null;
    listEl.style.display = 'none';
    listEl.innerHTML = '';
    document.getElementById(`ipd-${gender}-btn-nonsmiv`).style.background = '#6366f1';
    document.getElementById(`ipd-${gender}-btn-smiv`).style.background = '#94a3b8';
    return;
  }

  ipdActiveTab[gender] = tab;

  // highlight active button
  document.getElementById(`ipd-${gender}-btn-nonsmiv`).style.background = tab === 'nonsmiv' ? '#4f46e5' : '#94a3b8';
  document.getElementById(`ipd-${gender}-btn-smiv`).style.background = tab === 'smiv' ? '#4f46e5' : '#94a3b8';

  listEl.style.display = 'block';
  listEl.innerHTML = '<div style="color:#64748b; padding:8px;">กำลังโหลด...</div>';

  // ดึง assessments ที่มี record_type = 'new_patient' เพื่อเอา raw_data ล่าสุดต่อ HN
  const { data, error } = await supabaseClient
    .from('assessments')
    .select('hn, raw_data')
    .eq('record_type', 'smi-v_admission')
    .order('created_at', { ascending: false });

  if (error) {
    listEl.innerHTML = `<div style="color:#b91c1c;">เกิดข้อผิดพลาด: ${error.message}</div>`;
    return;
  }

  // เอา record ล่าสุดต่อ HN
  const seen = new Set();
  const records = [];
  for (const row of (data || [])) {
    if (!row.raw_data || seen.has(row.hn)) continue;
    seen.add(row.hn);
    records.push(row.raw_data);
  }

  // กรองเพศ
  const byGender = records.filter(r => r.gender === genderLabel);

  // กรอง smiv / nonsmiv
  const NON_SMIV_VALUE = 'ไม่เข้าข่าย SMI-V';
  const filtered = byGender.filter(r =>
    tab === 'nonsmiv'
      ? r.smi_v_result === NON_SMIV_VALUE
      : r.smi_v_result !== NON_SMIV_VALUE
  );

  if (filtered.length === 0) {
    listEl.innerHTML = '<div style="color:#64748b; padding:8px;">ไม่พบข้อมูลผู้ป่วย</div>';
    return;
  }

  // render list
  listEl.innerHTML = '';
  filtered.forEach((pt, idx) => {
    const itemId = `ipd-${gender}-${tab}-item-${idx}`;
    const detailId = `ipd-${gender}-${tab}-detail-${idx}`;
    const name = `${pt.first_name || ''} ${pt.last_name || ''}`.trim();

    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'border:1px solid #e2e8f0; border-radius:8px; margin-bottom:8px; overflow:hidden;';

    // header row (คลิกได้)
    const header = document.createElement('div');
    header.id = itemId;
    header.style.cssText = 'display:flex; justify-content:space-between; align-items:center; padding:10px 14px; cursor:pointer; background:#f8fafc; user-select:none;';
    header.innerHTML = `
      <span style="font-weight:600;">${pt.hn || '-'}</span>
      <span style="flex:1; margin-left:12px; color:#334155;">${name || '-'}</span>
      <span style="font-size:12px; color:#94a3b8;">▼</span>
    `;

    // detail panel
    const detail = document.createElement('div');
    detail.id = detailId;
    detail.style.cssText = 'display:none; padding:12px 14px; background:#fff; border-top:1px solid #e2e8f0;';
    detail.innerHTML = buildIpdDetail(pt);

    // toggle on click
    header.addEventListener('click', () => {
      const isOpen = detail.style.display === 'block';
      detail.style.display = isOpen ? 'none' : 'block';
      header.querySelector('span:last-child').textContent = isOpen ? '▼' : '▲';
    });

    wrapper.appendChild(header);
    wrapper.appendChild(detail);
    listEl.appendChild(wrapper);
  });
}

function buildIpdDetail(pt) {
  // แสดง key ที่ map ไว้ก่อน จากนั้น key ที่เหลือ
  const knownKeys = Object.keys(IPD_LABEL_MAP);
  const allKeys = Object.keys(pt);
  const extraKeys = allKeys.filter(k => !knownKeys.includes(k));
  const orderedKeys = [...knownKeys, ...extraKeys];

  let rows = '';
  for (const key of orderedKeys) {
    if (!(key in pt)) continue;
    const label = IPD_LABEL_MAP[key] || key;
    let val = pt[key];
    if (val === null || val === undefined || val === '') val = '-';
    if (typeof val === 'boolean') val = val ? 'ใช่' : 'ไม่ใช่';
    rows += `
      <div style="display:flex; gap:8px; padding:4px 0; border-bottom:1px solid #f1f5f9;">
        <span style="min-width:140px; color:#64748b; font-size:13px;">${label}</span>
        <span style="color:#1e293b; font-size:13px; word-break:break-word;">${val}</span>
      </div>`;
  }
  return rows;
}


// ฟังก์ชันสำหรับล้างข้อมูลและรีเซ็ตหน้าจอลงทะเบียนแรกรับกลับไปหน้าแรก
function resetNewPatientForm() {
  const svForm = document.getElementById('sv-form');
  if (!svForm) return;

  // 1. ล้างค่า Input, Select, Textarea ทั้งหมดภายในฟอร์มแรกรับ
  svForm.querySelectorAll('input:not([type="radio"]), select, textarea').forEach(el => el.value = '');
  svForm.querySelectorAll('input[type="radio"]').forEach(el => el.checked = false);
  svForm.querySelectorAll('.radio-card').forEach(c => c.classList.remove('selected'));

  // 2. ซ่อนกล่องเงื่อนไขย่อยต่างๆ ที่เคยถูกเปิดขึ้นมาให้กลับไปสถานะเริ่มต้น (ซ่อนไว้)
  const hideElements = [
    'diagnosisOther', 'TransferOther', 'admissionDateSection', 'substanceTypeDiv',
    'admitNumberDiv', 'addressSection', 'subdistrictSection', 'otherDistrictSection',
    'caregiverDetailsSection', 'patientPhoneSection', 'page1Error', 'page2Error', 'page3Error', 'page4Error', 'page5Error'
  ];
  hideElements.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  });

  // 3. รีเซ็ตหน้าย่อย ให้กลับมาแสดงหน้า sv_page1 และซ่อนหน้า 2-5
  for (let i = 1; i <= 5; i++) {
    const pageBox = document.getElementById(`sv_page${i}`);
    if (pageBox) {
      if (i === 1) pageBox.classList.remove('hidden');
      else pageBox.classList.add('hidden');
    }
  }

  // 4. ตั้งค่าตัวแปรวันปัจจุบันกลับคืนให้ช่องวันที่เข้ารับการรักษา
  const admissionDateEl = document.getElementById('admissionDate');
  const admissionDateDisplay = document.getElementById('admissionDateDisplay');
  if (admissionDateEl && admissionDateDisplay) {
    admissionDateEl.value = new Date().toISOString().split('T')[0];
    if (typeof formatDateBE === 'function') {
      admissionDateDisplay.value = formatDateBE(admissionDateEl.value);
    }
  }
}

// Initialize listeners for static elements moved into index.html
function initStaticListeners() {
  // New patient multipage form logic
  if (document.getElementById('sv-form')) initNewPatientSMIV();

  // SMI-V registration
  const regBtn = document.getElementById('reg-btn');
  if (regBtn) regBtn.addEventListener('click', submitRegister);
  // explicit login button binding and make register link inert (modal removed)
  const loginBtnEl = document.getElementById('loginBtn');
  if (loginBtnEl) loginBtnEl.addEventListener('click', login);
  const openRegLinkEl = document.getElementById('openRegLink');
  if (openRegLinkEl) openRegLinkEl.addEventListener('click', (e) => { 
    e.preventDefault(); 
    document.getElementById('registerModal').classList.remove('hidden');
  });

  // ผูก Event ให้ปุ่มใน Modal สมัครสมาชิก
  const closeRegBtn = document.getElementById('closeRegModalBtn');
  if (closeRegBtn) closeRegBtn.addEventListener('click', () => {
    document.getElementById('registerModal').classList.add('hidden');
    document.getElementById('userRegForm').reset();
    document.getElementById('regUserError').classList.add('hidden');
  });

  const submitRegBtn = document.getElementById('submitRegUserBtn');
  if (submitRegBtn) submitRegBtn.addEventListener('click', registerNewUser);
  // user menu interactions
  const userBtn = document.getElementById('userMenuBtn');
  const userDropdown = document.getElementById('userDropdown');
  if (userBtn) userBtn.addEventListener('click', () => { userDropdown.style.display = userDropdown.style.display === 'block' ? 'none' : 'block'; });
  const ddLogout = document.getElementById('dd-logout-btn');
  if (ddLogout) ddLogout.addEventListener('click', logoutFromMenu);

  async function registerNewUser() {
  const prefix = document.getElementById('regUserPrefix').value;
  const firstName = document.getElementById('regUserFirstName').value.trim();
  const lastName = document.getElementById('regUserLastName').value.trim();
  const username = document.getElementById('regUserUsername').value.trim();
  const password = document.getElementById('regUserPassword').value;
  const confirmPassword = document.getElementById('regUserConfirmPassword').value;
  const errorDiv = document.getElementById('regUserError');

  // ตรวจสอบความครบถ้วนของข้อมูล
  if (!prefix || !firstName || !lastName || !username || !password || !confirmPassword) {
    errorDiv.textContent = 'กรุณากรอกข้อมูลให้ครบทุกช่อง';
    errorDiv.classList.remove('hidden');
    return;
  }

  // ตรวจสอบรหัสผ่านว่าตรงกันหรือไม่
  if (password !== confirmPassword) {
    errorDiv.textContent = 'รหัสผ่าน และ ยืนยันรหัสผ่าน ไม่ตรงกัน';
    errorDiv.classList.remove('hidden');
    return;
  }

  const btn = document.getElementById('submitRegUserBtn');
  const originalText = btn.textContent;
  btn.textContent = 'กำลังบันทึก...';
  btn.disabled = true;
  errorDiv.classList.add('hidden');

  // ใช้ username@app.local เป็นอีเมลปลอมสำหรับระบบ Auth
  const fakeEmail = `${username}@app.local`;

  try {
    // 1. สมัครสมาชิกลงใน Supabase Auth
    const { data: authData, error: authError } = await supabaseClient.auth.signUp({
      email: fakeEmail,
      password: password
    });

    if (authError) throw authError;

    // 2. บันทึกข้อมูลส่วนตัวลงในตาราง users
    const { error: dbError } = await supabaseClient.from('users').insert([{
      username: username,
      prefix: prefix,
      first_name: firstName,
      last_name: lastName
    }]);

    if (dbError) throw dbError;

    // หากสำเร็จ ปิด Modal ล้างฟอร์ม และแจ้งเตือน
    document.getElementById('registerModal').classList.add('hidden');
    document.getElementById('userRegForm').reset();
    toast('สมัครสมาชิกเรียบร้อยแล้ว กรุณาเข้าสู่ระบบ');

  } catch (err) {
    let errMsg = err.message;
    if (errMsg.includes('already registered') || errMsg.includes('duplicate key value')) {
      errMsg = 'Username นี้มีผู้ใช้งานแล้ว';
    }
    errorDiv.textContent = 'เกิดข้อผิดพลาด: ' + errMsg;
    errorDiv.classList.remove('hidden');
  } finally {
    btn.textContent = originalText;
    btn.disabled = false;
  }
}

  // Assessment controls
  const btnMale = document.getElementById('btn-male-list');
  const btnFemale = document.getElementById('btn-female-list');
  if (btnMale) btnMale.addEventListener('click', () => loadPatientByGender('ชาย'));
  if (btnFemale) btnFemale.addEventListener('click', () => loadPatientByGender('หญิง'));
  const assessBtn = document.getElementById('assess-btn');
  if (assessBtn) assessBtn.addEventListener('click', submitAssess);

  const aDate = document.getElementById('a-date');
  if (aDate) aDate.value = new Date().toISOString().split('T')[0];
  if (document.getElementById('phua-items')) buildScaleTable('phua-items', 'phua', PHUA_ITEMS);
  if (document.getElementById('ghard-items')) buildScaleTable('ghard-items', 'ghard', GHARD_ITEMS);

// Admission date: show BE (พ.ศ.) in a visible text field while keeping hidden ISO input for form value
const admissionDateEl = document.getElementById('admissionDate');
const admissionDateDisplay = document.getElementById('admissionDateDisplay');

if (admissionDateEl && admissionDateDisplay) {
  if (!admissionDateEl.value) admissionDateEl.value = new Date().toISOString().split('T')[0];
  admissionDateDisplay.value = formatDateBE(admissionDateEl.value);
  
  admissionDateEl.addEventListener('change', () => {
    admissionDateDisplay.value = formatDateBE(admissionDateEl.value);
  });
  
  // 🔥 [แก้ไขจุดนี้] ย้ายมาผูกกับ admissionDateEl ตัวใสที่อยู่ด้านบนแทนเพื่อให้คลิกติดบนคอมพิวเตอร์
  admissionDateEl.addEventListener('click', () => {
    try {
      if (typeof admissionDateEl.showPicker === 'function') {
        admissionDateEl.showPicker();
      }
    } catch (e) {
      console.error("showPicker error:", e);
    }
  });
}

// Discharge date display (BE) — hidden ISO input `discharge-date` + visible `dischargeDateDisplay`
const dischargeDateEl = document.getElementById('discharge-date');
const dischargeDateDisplay = document.getElementById('dischargeDateDisplay');

if (dischargeDateEl && dischargeDateDisplay) {
  // แก้ไขบัค Timezone ให้เป็นเวลาท้องถิ่นไทย
  if (!dischargeDateEl.value) {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    dischargeDateEl.value = `${yyyy}-${mm}-${dd}`;
  }
  
  // แสดงผลครั้งแรก
  dischargeDateDisplay.value = formatDateBE(dischargeDateEl.value);
  
  // อัปเดตเมื่อมีการเปลี่ยนวันที่
  dischargeDateEl.addEventListener('change', () => {
    dischargeDateDisplay.value = formatDateBE(dischargeDateEl.value);
  });
  
  // 🔥 [แก้ไขจุดนี้] บังคับให้เปิดปฏิทินเมื่อคลิกที่อินพุตตัวใส (รองรับทั้ง Desktop และ Mobile)
  dischargeDateEl.addEventListener('click', () => {
    try {
      if (typeof dischargeDateEl.showPicker === 'function') {
        dischargeDateEl.showPicker();
      }
    } catch (e) {
      console.error("showPicker error:", e);
    }
  });

  const dischargeMethodSelect = document.getElementById('discharge-method');
  const transferOtherInput = document.getElementById('TransferOther');
  if (dischargeMethodSelect && transferOtherInput) {
    dischargeMethodSelect.addEventListener('change', () => {
      transferOtherInput.classList.toggle('hidden', dischargeMethodSelect.value !== 'transfer');
      if (dischargeMethodSelect.value !== 'transfer') transferOtherInput.value = '';
    });
  }
}

  // Discharge registry listeners
  const dischargeSearchBtn = document.getElementById('discharge-search-btn');
  const dischargeHNInput = document.getElementById('discharge-hn-search');
  if (dischargeSearchBtn) dischargeSearchBtn.addEventListener('click', searchDischargeByHN);
  if (dischargeHNInput) dischargeHNInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') searchDischargeByHN(); });
  const dischargeSaveBtn = document.getElementById('discharge-save-btn');
  if (dischargeSaveBtn) dischargeSaveBtn.addEventListener('click', saveDischarge);
  // Old patient (backup) lookup listeners
  const oldSearchBtn = document.getElementById('oldpatient-search-btn');
  const oldHNInput = document.getElementById('oldpatient-hn-search');
  if (oldSearchBtn) oldSearchBtn.addEventListener('click', searchOldPatientByHN);
  if (oldHNInput) oldHNInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') searchOldPatientByHN(); });
  // populate month/year dropdowns for backup history filters and wire change events
  const monthSelect = document.getElementById('dropdown_month');
  const yearSelect = document.getElementById('dropdown_year');
  function populateBackupFilters() {
    if (monthSelect) {
      monthSelect.innerHTML = '<option value="">ทุกเดือน</option>' +
        ['01','02','03','04','05','06','07','08','09','10','11','12'].map((m,i) => {
          const thai = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'][i];
          return `<option value="${m}">${thai}</option>`;
        }).join('');
    }
    if (yearSelect) {
      const now = new Date().getFullYear();
      const years = [now, now+1, now+2, now+3];
      yearSelect.innerHTML = '<option value="">ทุกปี</option>' + years.map(y => `<option value="${y}">${y+543}</option>`).join('');
    }
  }
  populateBackupFilters();
  if (monthSelect) monthSelect.addEventListener('change', () => {
    const hnDisplayed = (document.getElementById('oldpatient-patient-hn') || {}).textContent || (oldHNInput && oldHNInput.value.trim());
    if (hnDisplayed) fetchPatientBackupHistory(hnDisplayed);
  });
  if (yearSelect) yearSelect.addEventListener('change', () => {
    const hnDisplayed = (document.getElementById('oldpatient-patient-hn') || {}).textContent || (oldHNInput && oldHNInput.value.trim());
    if (hnDisplayed) fetchPatientBackupHistory(hnDisplayed);
  });
  // Edit patient listeners
  const editSearchBtn = document.getElementById('editpatient-search-btn');
  const editHNInput = document.getElementById('editpatient-hn-search');
  const editSaveBtn = document.getElementById('editpatient-save-btn');
  const editCancelBtn = document.getElementById('editpatient-cancel-btn');
  if (editSearchBtn) editSearchBtn.addEventListener('click', searchPatientForEdit);
  if (editHNInput) editHNInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') searchPatientForEdit(); });
  if (editSaveBtn) editSaveBtn.addEventListener('click', saveEditedPatient);
  if (editCancelBtn) editCancelBtn.addEventListener('click', () => {
    document.getElementById('editpatient-form').classList.add('hidden');
    document.getElementById('editpatient-hn-search').value = '';
  });
  
  // --- ระบบคลิกเปิด/ปิด User Dropdown (เวอร์ชันป้องกันตัวแปรชนกัน) ---
const navUserMenuBtn = document.getElementById('userMenuBtn');
const navUserMenuContainer = document.getElementById('userMenuContainer');

if (navUserMenuBtn) {
  // เมื่อคลิกที่ปุ่มโปรไฟล์ ให้สลับเปิด/ปิด
  navUserMenuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const targetDropdown = document.getElementById('userDropdown');
    if (targetDropdown) {
      targetDropdown.classList.toggle('show');
    }
  });

  // เมื่อคลิกที่อื่นภายนอกเมนู ให้ปิด Dropdown อัตโนมัติ
  window.addEventListener('click', (e) => {
    if (navUserMenuContainer && !navUserMenuContainer.contains(e.target)) {
      const targetDropdown = document.getElementById('userDropdown');
      if (targetDropdown) {
        targetDropdown.classList.remove('show');
      }
    }
  });
}
}

// ==========================================
// 4. ระบบทำงานฝั่ง Database (Supabase)
// ==========================================
window.$ = window.$ || function(id) { return document.getElementById(id); };

function toast(msg, isError = false) {
  let t = document.getElementById('app-toast');
  if (!t) { t = document.createElement('div'); t.id = 'app-toast'; t.className = 'app-toast'; document.body.appendChild(t); }
  t.textContent = msg;
  t.style.background = isError ? '#ef4444' : '#2563eb';
  t.classList.add('show');
  clearTimeout(t._timeout);
  t._timeout = setTimeout(() => { t.classList.remove('show'); }, 3000);
}

// -----------------------------
// Dashboard helpers
// -----------------------------
let dashboardAutoAdvanceTimer = null;

function formatDateLongBE(dateInput) {
  const months = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
  const d = dateInput ? new Date(dateInput) : new Date();
  if (isNaN(d)) return '';
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear() + 543}`;
}

async function getCount(filters = {}) {
  try {
    // Build base query for count
    const base = (modifier) => {
      let q = supabaseClient.from('patients').select('*', { count: 'exact', head: true });
      if (filters.gender) q = q.eq('gender', filters.gender);
      if (filters.smi_eq) q = q.eq('smi_type', filters.smi_eq);
      if (filters.smi_neq) q = q.neq('smi_type', filters.smi_neq);
      if (typeof filters.oas_eq !== 'undefined' && filters.oas_eq !== null) q = q.eq('oas_score', filters.oas_eq);
      if (typeof filters.oas_neq !== 'undefined' && filters.oas_neq !== null) q = q.neq('oas_score', filters.oas_neq);
      if (modifier) q = modifier(q);
      return q;
    };

    // If doctor filter provided, try multiple matching strategies: exact eq, then ilike variants
    if (filters.doctor) {
      // 1) exact match
      let r = await base(q => q.eq('admitting_doctor', filters.doctor));
      if (!r.error && r.count > 0) return r.count;

      // 2) try stripping common prefixes (e.g., 'แพทย์', 'Dr', 'Dr.') and ilike
      const stripped = filters.doctor.replace(/แพทย์|Dr\.?/g, '').trim();
      const patterns = [filters.doctor, stripped].filter(Boolean).map(s => `%${s}%`);
      for (const p of patterns) {
        r = await base(q => q.ilike('admitting_doctor', p));
        if (!r.error && r.count > 0) return r.count;
      }

      // 3) fallback: try partial match on last word
      const parts = filters.doctor.split(/\s+/).filter(Boolean);
      if (parts.length) {
        const last = parts[parts.length - 1];
        const r2 = await base(q => q.ilike('admitting_doctor', `%${last}%`));
        if (!r2.error && r2.count > 0) return r2.count;
      }

      // nothing matched
      return 0;
    }

    // No doctor filter: simple count
    const res = await base();
    if (res.error) throw res.error;
    return res.count || 0;
  } catch (e) {
    console.error('getCount error', e);
    throw e;
  }
}

async function fetchDashboardCounts() {
  try {
    const results = await Promise.all([
      getCount(), // total
      getCount({ smi_eq: 'ไม่เข้าข่าย SMI-V' }), // general
      getCount({ smi_neq: 'ไม่เข้าข่าย SMI-V' }), // smiv
      getCount({ gender: 'ชาย' }), // male total
      getCount({ gender: 'ชาย', smi_eq: 'ไม่เข้าข่าย SMI-V' }), // male general
      getCount({ gender: 'ชาย', smi_neq: 'ไม่เข้าข่าย SMI-V' }), // male smiv
      // Map SMI-V1..4 UI boxes to oas_score 0..3 respectively
      getCount({ gender: 'ชาย', oas_eq: 0 }),
      getCount({ gender: 'ชาย', oas_eq: 1 }),
      getCount({ gender: 'ชาย', oas_eq: 2 }),
      getCount({ gender: 'ชาย', oas_eq: 3 }),
      getCount({ gender: 'หญิง' }), // female total
      getCount({ gender: 'หญิง', smi_eq: 'ไม่เข้าข่าย SMI-V' }), // female general
      getCount({ gender: 'หญิง', smi_neq: 'ไม่เข้าข่าย SMI-V' }), // female smiv
      // Map SMI-V1..4 UI boxes to oas_score 0..3 respectively
      getCount({ gender: 'หญิง', oas_eq: 0 }),
      getCount({ gender: 'หญิง', oas_eq: 1 }),
      getCount({ gender: 'หญิง', oas_eq: 2 }),
      getCount({ gender: 'หญิง', oas_eq: 3 })
    ]);

    const [total, gen, smiv, maleTotal, maleGen, maleSmiv, male1, male2, male3, male4, femaleTotal, femaleGen, femaleSmiv, female1, female2, female3, female4] = results;

    // update DOM safely
    const setText = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = (v || 0); };
    setText('dashboard-total', total);
    setText('dashboard-gen', gen);
    setText('dashboard-smiv', smiv);

    setText('ward-male-total', maleTotal);
    setText('ward-male-gen', maleGen);
    setText('ward-male-smiv', maleSmiv);
    setText('ward-male-smiv1', male1);
    setText('ward-male-smiv2', male2);
    setText('ward-male-smiv3', male3);
    setText('ward-male-smiv4', male4);

    setText('ward-female-total', femaleTotal);
    setText('ward-female-gen', femaleGen);
    setText('ward-female-smiv', femaleSmiv);
    setText('ward-female-smiv1', female1);
    setText('ward-female-smiv2', female2);
    setText('ward-female-smiv3', female3);
    setText('ward-female-smiv4', female4);

    const dateEl = document.getElementById('dashboardDate');
    if (dateEl) dateEl.textContent = formatDateLongBE(new Date());

  } catch (e) {
    console.error('fetchDashboardCounts error', e);
    toast('ไม่สามารถโหลดข้อมูลแดชบอร์ดได้', true);
  }
}

function startDashboardAutoAdvance() {
  stopDashboardAutoAdvance();
  dashboardAutoAdvanceTimer = setTimeout(() => {
    const btn = document.getElementById('dashboard-next-home');
    if (btn) btn.click();
  }, 15000);
}

function stopDashboardAutoAdvance() {
  if (dashboardAutoAdvanceTimer) { clearTimeout(dashboardAutoAdvanceTimer); dashboardAutoAdvanceTimer = null; }
}

function initDashboard() {
  // initial fetch
  fetchDashboardCounts();

  // wire home arrow buttons
  const nextBtn = document.getElementById('dashboard-next-home');
  const prevBtn = document.getElementById('dashboard-prev-home');
  if (nextBtn) {
    nextBtn.addEventListener('click', (e) => {
      const target = nextBtn.dataset.nextPage || 'page-dashboard-2';
      if (target && document.getElementById(target)) {
        showPage(target.replace(/^page-/, ''));
      } else {
        toast('ยังไม่มีหน้าถัดไป');
      }
    });
  }
  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      // go to previous dashboard page (wrap)
      if (document.getElementById('page-dashboard-2')) showPage('dashboard-2');
    });
  }

  // refresh counts when clicking the top card area
  const dashCard = document.getElementById('dashboard-card');
  if (dashCard) dashCard.addEventListener('click', () => fetchDashboardCounts());

  // start auto advance timer
  startDashboardAutoAdvance();
}

// -----------------------------
// Dashboard page 2: per-doctor counts
// -----------------------------
// แก้ไขจากชื่อย่อ เป็นชื่อเต็มตามที่คุณต้องการ
const DASH_DOCTORS = [
  { id: 'anya', name: 'พญ. อนัญญา ชัยวัฒนพงศ์' },
  { id: 'hattayaphat', name: 'พญ. หทัยภัทร วิทยศักดิ์พันธุ์' },
  { id: 'saenphon', name: 'นพ. แสนพล บุญชัย' },
  { id: 'areeya', name: 'พญ. อารียา สมบูรณ์เกื้อ' },
  { id: 'patimakorn', name: 'พญ. ปฏิมาภรณ์ ผลบุณยรักษ์' },
  { id: 'boonprom', name: 'พญ. บุญพร้อม เชษฐรตานนท์' }
];

const DOCTORS_PAGE3 = [
  { id: 'poorchiva', name: 'นพ.พูร์ ชีวะสุทโธ', match: 'พูร์' }
];

async function fetchDoctorCounts() {
  try {
    for (const d of DASH_DOCTORS) {
      const [total, gen, smiv] = await Promise.all([
        getCount({ doctor: d.name }),
        getCount({ doctor: d.name, smi_eq: 'ไม่เข้าข่าย SMI-V' }),
        getCount({ doctor: d.name, smi_neq: 'ไม่เข้าข่าย SMI-V' })
      ]);
      const setText = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = (v || 0); };
      setText(`doc-${d.id}-total`, total);
      setText(`doc-${d.id}-gen`, gen);
      setText(`doc-${d.id}-smiv`, smiv);
    }
  } catch (e) {
    console.error('fetchDoctorCounts error', e);
    toast('ไม่สามารถโหลดสถิติแพทย์ได้', true);
  }
}

function initDashboard2() {
  // render doctor cards (only once)
  const grid = document.getElementById('dashboard-2-grid');
  if (grid && !grid.dataset.rendered) {
    grid.innerHTML = DASH_DOCTORS.map(d => `
      <div class="doctor-card" id="doc-card-${d.id}">
        <h3>${d.name.split(/\s+/).slice(0, 2).join(' ')}</h3>
        <div style="display:flex; justify-content:center; margin-top:8px;">
          <div class="doc-total" id="doc-${d.id}-total">0</div>
        </div>
        <div class="doc-stats">
          <div class="stat" style="display: flex; flex-direction: column; align-items: center;">
            <div class="small-muted">จิตเวชทั่วไป</div>
            <div id="doc-${d.id}-gen" style="font-weight:700; margin-top: auto; padding-top: 6px;">0</div>
          </div>
          
          <div class="stat" style="display: flex; flex-direction: column; align-items: center;">
            <div class="small-muted">SMI-V</div>
            <div id="doc-${d.id}-smiv" style="font-weight:700; margin-top: auto; padding-top: 6px;">0</div>
          </div>
        </div>
      </div>
    `).join('');
    grid.dataset.rendered = '1';
  }

  // update date header
  const dateEl = document.getElementById('dashboard2Date');
  if (dateEl) dateEl.textContent = formatDateLongBE(new Date());

  // load per-doctor counts
  fetchDoctorCounts();

  // navigation for dashboard-2
  const prev = document.getElementById('dashboard-prev-2');
  if (prev) prev.addEventListener('click', () => showPage('home'));
  const next = document.getElementById('dashboard-next-2');
  if (next) next.addEventListener('click', () => showPage('dashboard-3'));
}

async function initDashboard3() {
  const grid = document.getElementById('dashboard-3-grid');
  if (!grid) return;

  if (!grid.dataset.rendered) {
    grid.innerHTML = DOCTORS_PAGE3.map(d => `
      <div class="doctor-card" id="doc-card-${d.id}">
        <h3>${d.name.split(/\s+/).slice(0, 2).join(' ')}</h3>
        <div style="display:flex; justify-content:center; margin-top:8px;">
          <div class="doc-total" id="doc-${d.id}-total">0</div>
        </div>
        <div class="doc-stats">
          <div class="stat" style="display: flex; flex-direction: column; align-items: center;">
            <div class="small-muted">จิตเวชทั่วไป</div>
            <div id="doc-${d.id}-gen" style="font-weight:700; margin-top:auto; padding-top:6px;">0</div>
          </div>
          <div class="stat" style="display:flex; flex-direction:column; align-items:center;">
            <div class="small-muted">SMI-V</div>
            <div id="doc-${d.id}-smiv" style="font-weight:700; margin-top:auto; padding-top:6px;">0</div>
          </div>
        </div>
      </div>
    `).join('');
    grid.dataset.rendered = '1';
  }

  const dateEl = document.getElementById('dashboard3Date');
  if (dateEl) dateEl.textContent = formatDateLongBE(new Date());

  // load counts for page3 doctors
  for (const d of DOCTORS_PAGE3) {
    const [gen, smiv] = await Promise.all([
      getCount({ doctor: d.match, smi_eq: 'ไม่เข้าข่าย SMI-V' }),
      getCount({ doctor: d.match, smi_neq: 'ไม่เข้าข่าย SMI-V' })
    ]);
    const total = gen + smiv;
    const totalEl = document.getElementById(`doc-${d.id}-total`);
    const genEl  = document.getElementById(`doc-${d.id}-gen`);
    const smivEl = document.getElementById(`doc-${d.id}-smiv`);
    if (genEl)  genEl.textContent  = gen;
    if (smivEl) smivEl.textContent = smiv;
    if (totalEl) totalEl.textContent = total;
  }

  const prev = document.getElementById('dashboard-prev-3');
  if (prev) prev.addEventListener('click', () => showPage('dashboard-2'));
  const next = document.getElementById('dashboard-next-3');
  if (next) next.addEventListener('click', () => showPage('home'));
}

// ฟังก์ชันดึงข้อมูลผู้ป่วยแยกชาย/หญิง มาแสดงเป็นลิสต์รายชื่อ
async function loadPatientByGender(gender) {
  const listArea = document.getElementById('patient-list-area');
  listArea.style.display = 'block';
  listArea.innerHTML = '<div style="text-align:center; padding:12px; color:#64748b;">กำลังโหลดข้อมูลผู้ป่วย...</div>';
  
  // ซ่อนข้อมูลเก่าและเคลียร์ตัวแปร HN ปัจจุบัน
  document.getElementById('patient-info-card').style.display = 'none';
  document.getElementById('assess-form').style.display = 'none';
  currentAssessHN = '';

  const { data: patients, error } = await supabaseClient
    .from('patients')
    .select('*')
    .eq('gender', gender);

  if (error) {
    listArea.innerHTML = `<div style="color:#ef4444; padding:12px;">เกิดข้อผิดพลาด: ${error.message}</div>`;
    return;
  }

  if (!patients || patients.length === 0) {
    listArea.innerHTML = `<div style="text-align:center; padding:12px; color:#64748b;">ไม่พบข้อมูลผู้ป่วยเพศ${gender}</div>`;
    return;
  }

  // ดึง assessment ล่าสุดของแต่ละ HN เพื่อเอา admission_date จาก raw_data
  const hnList = patients.map(p => p.hn);
  const { data: assessRows } = await supabaseClient
    .from('assessments')
    .select('hn, raw_data, created_at')
    .in('hn', hnList)
    .order('created_at', { ascending: false });

  // สร้าง map: hn -> admission_date จาก assessment ล่าสุด
  const admitDateMap = {};
  if (assessRows && assessRows.length) {
    for (const row of assessRows) {
      if (!admitDateMap[row.hn]) {
        const raw = row.raw_data || {};
        const admDate = raw.admission_date;
        if (admDate) {
          admitDateMap[row.hn] = typeof formatDateBE === 'function' ? formatDateBE(admDate) : admDate;
        }
      }
    }
  }

  // เก็บกักข้อมูลลง Cache เอาไว้ใช้ตอนกดเลือกรายบุคคล (เพิ่ม _admitDateFromAssessment)
  fetchedPatientsCache = patients.map(p => ({
    ...p,
    _admitDateFromAssessment: admitDateMap[p.hn] || null
  }));

  listArea.innerHTML = fetchedPatientsCache.map((patient, index) => {
    const admitDisplay = patient._admitDateFromAssessment || 'ไม่ระบุ';
    return `
      <div class="patient-item" style="padding:12px; border-bottom:1px solid #e2e8f0; cursor:pointer; border-radius:6px; margin-bottom:6px; background:#fff; transition: background 0.2s;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='#fff'" onclick="selectPatientFromCache(${index})">
        <div style="font-weight:700; color:#1e293b; font-size:15px; margin-bottom:4px;">ชื่อผู้ป่วย: ${patient.prefix || ''}${patient.full_name || ''}</div>
        <div style="font-size:13px; color:#475569; display:grid; grid-template-columns:1fr 1fr; gap:6px;">
          <div><strong>รหัส HN:</strong> ${patient.hn}</div>
          <div><strong>smi_type:</strong> ${patient.smi_type || 'ไม่ระบุ'}</div>
          <div><strong>วันที่รับมา (admit_date):</strong> ${admitDisplay}</div>
          <div><strong>แพทย์เจ้าของไข้:</strong> ${patient.admitting_doctor || 'ไม่ระบุ'}</div>
        </div>
      </div>
    `;
  }).join('');
}


// ฟังก์ชันเมื่อผู้ใช้งานคลิกเลือกผู้ป่วยจากรายชื่อรายการ
function selectPatientFromCache(index) {
  const patient = fetchedPatientsCache[index];
  if (!patient) return;

  currentAssessHN = patient.hn;
  
  const infoCard = document.getElementById('patient-info-card');
  infoCard.style.display = 'block';
  
  // แสดงข้อมูลผู้ป่วยทั้งหมดที่ถูกบันทึกไว้ในส่วนบน
  infoCard.innerHTML = `
    <h3 style="margin-top:0; margin-bottom:10px; color:#1e3a8a; border-bottom:2px solid #e2e8f0; padding-bottom:6px; font-size:16px;">ข้อมูลผู้ป่วยทั้งหมดที่บันทึกไว้</h3>
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; font-size:14px; line-height:1.6; color:#334155;">
      <div><strong>ชื่อ-นามสกุล:</strong> ${patient.prefix || ''}${patient.full_name || ''}</div>
      <div><strong>รหัส HN:</strong> ${patient.hn}</div>
      <div><strong>เพศ:</strong> ${patient.gender || 'ไม่ระบุ'}</div>
      <div><strong>อายุ:</strong> ${patient.age ? patient.age + ' ปี' : 'ไม่ระบุ'}</div>
      <div><strong>ประเภทผู้ป่วย (smi_type):</strong> ${patient.smi_type || 'ไม่ระบุ'}</div>
      <div><strong>วันที่รับมา (admit_date):</strong> ${patient._admitDateFromAssessment || 'ไม่ระบุ'}</div>
      <div><strong>แพทย์เจ้าของไข้ (admitting_doctor):</strong> ${patient.admitting_doctor || 'ไม่ระบุ'}</div>
      <div><strong>สารเสพติด/สุรา:</strong> ${patient.substance || 'ไม่ระบุ'}</div>
    </div>
  `;
  
  // เปิดแสดงแบบประเมินถัดลงมาด้านล่างทันที
  document.getElementById('assess-form').style.display = 'grid';
  infoCard.scrollIntoView({ behavior: 'smooth' });
}

// ซิงค์ Profile ไปตาราง patients
async function syncPatientProfileToSupabase(record) {
  const profile = {
    hn: record.hn,
    prefix: record.prefix || '', 
    full_name: record.full_name || `${record.first_name || ''} ${record.last_name || ''}`.trim(),
    gender: record.gender || null,
    age: record.age ? parseInt(record.age, 10) : null,
    smi_type: record.smi_v_result || record.smi_type || 'ไม่ระบุ',
    substance: record.substance_use || record.substance || 'ไม่ระบุ',
    admit_date: record.admission_date || record.admit_date || new Date().toISOString().split('T')[0],
    admitting_doctor: record.admitting_doctor || 'ไม่ระบุ', // เพิ่มการซิงค์ฟิลด์แพทย์ลงตารางหลักเพื่อความสมบูรณ์
    // OAS: store score and risk if provided during registration/assessment
    oas_score: (record.oas_score !== undefined && record.oas_score !== null && record.oas_score !== '') ? parseInt(record.oas_score, 10) : null,
    oas_risk: record.oas_risk || record.oas_risk_level || null
  };

  const { error } = await supabaseClient.from('patients').upsert(profile, { onConflict: 'hn' });
  if (error) {
    console.error('Profile Error:', error);
    toast('บันทึกข้อมูลผู้ป่วยล้มเหลว: ' + error.message, true);
    return false;
  }
  return true;
}

// เซฟ Assessment ไปตาราง assessments (ช่อง raw_data เก็บของยิบย่อย)
async function saveAssessmentToSupabase(record, type) {
  const { error } = await supabaseClient.from('assessments').insert([{
    hn: record.hn,
    record_type: type,
    assess_date: record.assess_date || new Date().toISOString().split('T')[0],
    shift: record.shift || null,
    oas_score: record.oas_score !== '' ? parseInt(record.oas_score) : null,
    raw_data: record 
  }]);
  if (error) {
    console.error("Assessment Log Error:", error);
    toast('บันทึกผลล้มเหลว: ' + error.message, true);
    return false;
  }
  return true;
}
// -----------------------------
// Discharge registry helpers
// -----------------------------
function formatDateBE(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const yearBE = d.getFullYear() + 543;
  return `${day}/${month}/${yearBE}`;
}

function createBackupSQL() {
  return `create table public.backup (
  hn text not null,
  prefix text null,
  full_name text not null,
  gender text null,
  age integer null,
  smi_type text null,
  substance text null,
  admit_date date null,
  admitting_doctor text null,
  last_diagnosis text null,
  discharge_method text null,
  discharge_date date null,
  discharge_type text null,
  discharged_at timestamp with time zone default now(),
  raw_data jsonb null,
  constraint backup_pkey primary key (hn)
) TABLESPACE pg_default;`;
}

async function searchDischargeByHN() {
  const hnEl = document.getElementById('discharge-hn-search');
  const hn = hnEl ? (hnEl.value || '').trim() : '';
  if (!hn) { toast('กรุณากรอก HN', true); return; }
  const { data: patient, error } = await supabaseClient.from('patients').select('*').eq('hn', hn).single();
  if (error) {
    console.error('Search error', error);
    toast('ค้นหาล้มเหลว: ' + (error.message || ''), true);
    return;
  }
  if (!patient) { toast('ไม่พบผู้ป่วย HN: ' + hn, true); return; }
  currentDischargePatient = patient;
  document.getElementById('discharge-patient-name').textContent = ((patient.prefix || '') + ' ' + (patient.full_name || '')).trim();
  document.getElementById('discharge-patient-admit').textContent = patient.admit_date ? formatDateBE(patient.admit_date) : 'ไม่ระบุ';
  document.getElementById('discharge-patient-age').textContent = patient.age || 'ไม่ระบุ';
  document.getElementById('discharge-patient-smiv').textContent = patient.smi_type || 'ไม่ระบุ';
  document.getElementById('discharge-patient-doctor').textContent = patient.admitting_doctor || 'ไม่ระบุ';
  document.getElementById('discharge-patient-info').classList.remove('hidden');
  document.getElementById('discharge-form').classList.remove('hidden');
  document.getElementById('discharge-save-btn').classList.remove('hidden');
}

async function saveDischarge() {
  if (!currentDischargePatient) { toast('กรุณาค้นหาและเลือกผู้ป่วยก่อน', true); return; }
  const methodSelect = document.getElementById('discharge-method');
  let method = methodSelect ? methodSelect.value : '';
  if (method === 'transfer') {
    const other = (document.getElementById('TransferOther') || {}).value || '';
    method = other ? `transfer (${other})` : 'transfer';
  }
  const dischargeDate = (document.getElementById('discharge-date') || {}).value || '';
  const lastDx = (document.getElementById('discharge-last-dx') || {}).value || '';
  const dischargeTypeEl = document.querySelector('input[name="discharge-type"]:checked');
  const dischargeType = dischargeTypeEl ? dischargeTypeEl.value : '';
  if (!method || !dischargeDate || !lastDx || !dischargeType) { toast('กรุณากรอกข้อมูลการจำหน่ายให้ครบ', true); return; }
  const record = {
    hn: currentDischargePatient.hn,
    prefix: currentDischargePatient.prefix || null,
    full_name: currentDischargePatient.full_name || null,
    gender: currentDischargePatient.gender || null,
    age: currentDischargePatient.age || null,
    smi_type: currentDischargePatient.smi_type || null,
    substance: currentDischargePatient.substance || null,
    admit_date: currentDischargePatient.admit_date || null,
    admitting_doctor: currentDischargePatient.admitting_doctor || null,
    last_diagnosis: lastDx,
    discharge_method: method,
    discharge_date: dischargeDate,
    discharge_type: dischargeType,
    discharged_at: new Date().toISOString(),
    // raw_data: include patient record and, if available, latest assessment.raw_data merged in
    raw_data: currentDischargePatient
  };
  // try to enrich raw_data with latest assessment.raw_data for this HN
  try {
    const { data: arows, error: aerr } = await supabaseClient.from('assessments')
      .select('raw_data')
      .eq('hn', currentDischargePatient.hn)
      .order('assess_date', { ascending: false })
      .limit(1);
    if (!aerr && arows && arows.length) {
      const assesRaw = arows[0].raw_data || {};
      // merge: assessment raw_data takes precedence for assessment-specific keys
      record.raw_data = Object.assign({}, currentDischargePatient, assesRaw);
    }
  } catch (e) {
    console.warn('Failed to enrich backup.raw_data from assessments', e);
  }
  // Try to insert into backup; if table not exists, show SQL in console
  const { error: insertError } = await supabaseClient.from('backup').insert([record]);
  if (insertError) {
    console.error('Backup insert error', insertError);
    toast('บันทึกสำรองล้มเหลว: ' + (insertError.message || ''), true);
    console.log('SQL to create backup table:\n' + createBackupSQL());
    return;
  }
  const { error: delError } = await supabaseClient.from('patients').delete().eq('hn', currentDischargePatient.hn);
  if (delError) {
    console.error('Delete error', delError);
    toast('ลบผู้ป่วยจาก patients ล้มเหลว: ' + (delError.message || ''), true);
    return;
  }
  toast('จำหน่ายผู้ป่วยเรียบร้อย');
  // clear UI & reset form
  const dischargeForm = document.getElementById('discharge-form');
  if (dischargeForm) dischargeForm.reset();
  document.getElementById('discharge-patient-info').classList.add('hidden');
  dischargeForm.classList.add('hidden');
  document.getElementById('discharge-save-btn').classList.add('hidden');
  document.getElementById('discharge-hn-search').value = '';
  document.getElementById('discharge-msg').classList.add('hidden');
  document.querySelectorAll('#page-smiv .radio-card').forEach(c => c.classList.remove('selected'));
  currentDischargePatient = null;
}

// Search in backup table for old patient records
async function searchOldPatientByHN() {
  const hnEl = document.getElementById('oldpatient-hn-search');
  const hn = hnEl ? (hnEl.value || '').trim() : '';
  if (!hn) { toast('กรุณากรอก HN', true); return; }
  const { data: recs, error } = await supabaseClient.from('backup')
    .select('*')
    .eq('hn', hn)
    .order('admit_date', { ascending: false })
    .limit(1);
  if (error) {
    console.error('Old search error', error);
    toast('ค้นหาล้มเหลว: ' + (error.message || ''), true);
    return;
  }
  const rec = (recs && recs.length) ? recs[0] : null;
  if (!rec) { toast('ไม่พบข้อมูลสำรองสำหรับ HN: ' + hn, true); return; }
  // show requested fields and pull caregiver/residence from backup.raw_data when present
  const raw = rec.raw_data || {};
  document.getElementById('oldpatient-full_name').textContent = rec.full_name || raw.full_name || '';
  document.getElementById('oldpatient-age').textContent = rec.age || raw.age || 'ไม่ระบุ';
  document.getElementById('oldpatient-gender').textContent = rec.gender || raw.gender || 'ไม่ระบุ';
  document.getElementById('oldpatient-caregiver-name').textContent = raw.caregiver_name || raw.caregiverName || raw.caregiver || 'ไม่ระบุ';
  document.getElementById('oldpatient-caregiver-relation').textContent = raw.caregiver_relation || raw.caregiverRelation || 'ไม่ระบุ';
  document.getElementById('oldpatient-caregiver-phone').textContent = raw.caregiver_phone || raw.caregiverPhone || 'ไม่ระบุ';
  document.getElementById('oldpatient-residence-details').textContent = raw.residence_details || raw.residenceDetails || raw.residence_details || 'ไม่ระบุ';
  document.getElementById('oldpatient-patient-hn').textContent = rec.hn || '';
  document.getElementById('oldpatient-patient-admit').textContent = rec.admit_date ? formatDateBE(rec.admit_date) : (raw.admission_date ? formatDateBE(raw.admission_date) : 'ไม่ระบุ');

  document.getElementById('oldpatient-patient-info').classList.remove('hidden');

  // Populate history table for this HN
  try { fetchPatientBackupHistory(hn); } catch (e) { console.warn('fetchPatientBackupHistory failed', e); }
}

// Fetch backup history for a given HN and render into #backupHistoryTableBody
async function fetchPatientBackupHistory(hn) {
  if (!hn) return;
  const month = (document.getElementById('dropdown_month') || {}).value || '';
  const year = (document.getElementById('dropdown_year') || {}).value || '';

  // If month is selected but year is not, prompt user to select year
  if (month && !year) { toast('กรุณาเลือกปีด้วยเพื่อกรองตามเดือน', true); return; }

  let query = supabaseClient.from('backup').select('admit_date, discharge_date, last_diagnosis').eq('hn', hn).order('admit_date', { ascending: false });

  if (year) {
    let startDate = `${year}-01-01`;
    let endDate = `${year}-12-31`;
    if (month) {
      // compute last day of month
      const mm = parseInt(month, 10);
      const lastDay = new Date(parseInt(year,10), mm, 0).getDate();
      startDate = `${year}-${month}-01`;
      endDate = `${year}-${month}-${String(lastDay).padStart(2,'0')}`;
    }
    query = query.gte('admit_date', startDate).lte('admit_date', endDate);
  }

  const { data: rows, error } = await query;
  const tbody = document.getElementById('backupHistoryTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';
  if (error) {
    console.error('Failed to fetch backup history', error);
    toast('ดึงประวัติสำรองล้มเหลว', true);
    return;
  }

  if (!rows || rows.length === 0) {
    tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:12px; color:#64748b;">ไม่พบประวัติในช่วงที่เลือก</td></tr>';
    return;
  }

  // Render rows
  tbody.innerHTML = rows.map(r => {
    const admit = r.admit_date ? formatDateBE(r.admit_date) : '-';
    const disc = r.discharge_date ? formatDateBE(r.discharge_date) : '-';
    const dx = r.last_diagnosis || '-';
    return `<tr><td>${admit}</td><td>${disc}</td><td style="text-align:left">${dx}</td></tr>`;
  }).join('');
}

// Search patient in `patients` table for editing
async function searchPatientForEdit() {
  const hnEl = document.getElementById('editpatient-hn-search');
  const hn = hnEl ? (hnEl.value || '').trim() : '';
  if (!hn) { toast('กรุณากรอก HN', true); return; }
  // Prefer to load latest assessment.raw_data for this HN
  try {
    const { data: assessments, error: aerr } = await supabaseClient
      .from('assessments')
      .select('*')
      .eq('hn', hn)
      .order('assess_date', { ascending: false })
      .limit(1);

    if (aerr) {
      console.error('Assessments query error', aerr);
      toast('ค้นหาล้มเหลว: ' + (aerr.message || ''), true);
      return;
    }

    if (assessments && assessments.length) {
      const a = assessments[0];
      currentEditAssessment = a;
      const src = a.raw_data || {};

      // basic identifiers
      document.getElementById('edit-hn').value = hn || '';
      document.getElementById('edit-prefix').value = src.prefix || '';
      document.getElementById('edit-first_name').value = src.first_name || '';
      document.getElementById('edit-last_name').value = src.last_name || '';
      document.getElementById('edit-full_name').value = src.full_name || `${src.first_name || ''} ${src.last_name || ''}`.trim();
      document.getElementById('edit-gender').value = src.gender || '';
      document.getElementById('edit-age').value = src.age || '';

      // smi/v and diagnosis
      document.getElementById('edit-is_smi_v').checked = !!src.is_smi_v;
      document.getElementById('edit-diagnosis').value = src.diagnosis || '';
      document.getElementById('edit-smi_v_result').value = src.smi_v_result || '';
      document.getElementById('edit-smi_type').value = src.smi_type || src.smi_v_result || '';

      // substance
      document.getElementById('edit-substance_use').value = src.substance_use || '';
      document.getElementById('edit-substance_type').value = src.substance_type || '';

      // contact / phones
      document.getElementById('edit-patient_phone').value = src.patient_phone || '';
      document.getElementById('edit-caregiver_name').value = src.caregiver_name || '';
      document.getElementById('edit-caregiver_relation').value = src.caregiver_relation || '';
      document.getElementById('edit-caregiver_phone').value = src.caregiver_phone || '';

      // admission / location
      document.getElementById('edit-admission_date').value = src.admission_date || (a.assess_date || '') || '';
      document.getElementById('edit-admitting_doctor').value = src.admitting_doctor || a.admitting_doctor || '';
      document.getElementById('edit-admission_source').value = src.admission_source || '';

      // residence
      document.getElementById('edit-residence_type').value = src.residence_type || '';
      document.getElementById('edit-residence_details').value = src.residence_details || '';
      document.getElementById('edit-residence_district').value = src.residence_district || '';
      document.getElementById('edit-residence_subdistrict').value = src.residence_subdistrict || '';

      // behaviour / risk
      document.getElementById('edit-aggressive_behavior').value = src.aggressive_behavior || '';
      document.getElementById('edit-oas_score').value = a.oas_score != null ? a.oas_score : (src.oas_score || '');
      document.getElementById('edit-oas_risk_level').value = src.oas_risk_level || src.oas_risk || '';

      document.getElementById('editpatient-form').classList.remove('hidden');
      document.getElementById('editpatient-form').scrollIntoView({ behavior: 'smooth' });
      return;
    }

    // fallback: try patients table if no assessment found
    const { data: patient, error: perr } = await supabaseClient.from('patients').select('*').eq('hn', hn).single();
    if (perr) {
      console.error('Patients fallback error', perr);
      toast('ค้นหาล้มเหลว: ' + (perr.message || ''), true);
      return;
    }
    if (!patient) { toast('ไม่พบผู้ป่วย HN: ' + hn, true); return; }

    currentEditAssessment = null;
    document.getElementById('edit-hn').value = patient.hn || '';
    document.getElementById('edit-prefix').value = patient.prefix || '';
    document.getElementById('edit-full_name').value = patient.full_name || '';
    document.getElementById('edit-gender').value = patient.gender || '';
    document.getElementById('edit-age').value = patient.age || '';
    document.getElementById('edit-smi_type').value = patient.smi_type || '';
    document.getElementById('edit-substance').value = patient.substance || '';
    if (patient.admit_date) document.getElementById('edit-admit_date').value = patient.admit_date;
    else document.getElementById('edit-admit_date').value = '';
    document.getElementById('edit-admitting_doctor').value = patient.admitting_doctor || '';
    document.getElementById('edit-oas_score').value = patient.oas_score || '';
    document.getElementById('edit-oas_risk').value = patient.oas_risk || '';

    document.getElementById('editpatient-form').classList.remove('hidden');
    document.getElementById('editpatient-form').scrollIntoView({ behavior: 'smooth' });

  } catch (e) {
    console.error('searchPatientForEdit error', e);
    toast('เกิดข้อผิดพลาดในการค้นหา', true);
  }
}

// Save edited patient back to `patients` table
async function saveEditedPatient() {
  const hn = (document.getElementById('edit-hn') || {}).value || '';
  if (!hn) { toast('HN ไม่ถูกต้อง', true); return; }
  const payload = {
    hn: hn,
    prefix: (document.getElementById('edit-prefix') || {}).value || null,
    full_name: (document.getElementById('edit-full_name') || {}).value || null,
    gender: (document.getElementById('edit-gender') || {}).value || null,
    age: (document.getElementById('edit-age') || {}).value ? parseInt(document.getElementById('edit-age').value, 10) : null,
    smi_type: (document.getElementById('edit-smi_type') || {}).value || null,
    substance: (document.getElementById('edit-substance') || {}).value || null,
    admit_date: (document.getElementById('edit-admit_date') || {}).value || null,
    admitting_doctor: (document.getElementById('edit-admitting_doctor') || {}).value || null,
    oas_score: (document.getElementById('edit-oas_score') || {}).value ? parseInt(document.getElementById('edit-oas_score').value, 10) : null,
    oas_risk: (document.getElementById('edit-oas_risk') || {}).value || null
  };
  try {
    // 1) upsert to patients table
    const { error: perr } = await supabaseClient.from('patients').upsert([payload], { onConflict: 'hn' });
    if (perr) {
      console.error('Save patients error', perr);
      toast('บันทึกข้อมูลผู้ป่วยล้มเหลว: ' + (perr.message || ''), true);
      return;
    }

    // 2) if we have a linked assessment selected, update its raw_data and oas_score
    if (currentEditAssessment && currentEditAssessment.id) {
      // build full updated raw_data from form fields
      const updatedRaw = {
        hn: hn,
        prefix: (document.getElementById('edit-prefix') || {}).value || null,
        first_name: (document.getElementById('edit-first_name') || {}).value || null,
        last_name: (document.getElementById('edit-last_name') || {}).value || null,
        full_name: (document.getElementById('edit-full_name') || {}).value || `${(document.getElementById('edit-first_name')||{}).value || ''} ${(document.getElementById('edit-last_name')||{}).value || ''}`.trim(),
        gender: (document.getElementById('edit-gender') || {}).value || null,
        age: (document.getElementById('edit-age') || {}).value || null,
        is_smi_v: !!(document.getElementById('edit-is_smi_v') || {}).checked,
        diagnosis: (document.getElementById('edit-diagnosis') || {}).value || null,
        smi_v_result: (document.getElementById('edit-smi_v_result') || {}).value || null,
        smi_type: (document.getElementById('edit-smi_type') || {}).value || null,
        substance_use: (document.getElementById('edit-substance_use') || {}).value || null,
        substance_type: (document.getElementById('edit-substance_type') || {}).value || null,
        patient_phone: (document.getElementById('edit-patient_phone') || {}).value || null,
        caregiver_name: (document.getElementById('edit-caregiver_name') || {}).value || null,
        caregiver_relation: (document.getElementById('edit-caregiver_relation') || {}).value || null,
        caregiver_phone: (document.getElementById('edit-caregiver_phone') || {}).value || null,
        admission_date: (document.getElementById('edit-admission_date') || {}).value || null,
        admitting_doctor: (document.getElementById('edit-admitting_doctor') || {}).value || null,
        admission_source: (document.getElementById('edit-admission_source') || {}).value || null,
        residence_type: (document.getElementById('edit-residence_type') || {}).value || null,
        residence_details: (document.getElementById('edit-residence_details') || {}).value || null,
        residence_district: (document.getElementById('edit-residence_district') || {}).value || null,
        residence_subdistrict: (document.getElementById('edit-residence_subdistrict') || {}).value || null,
        aggressive_behavior: (document.getElementById('edit-aggressive_behavior') || {}).value || null,
        oas_risk_level: (document.getElementById('edit-oas_risk_level') || {}).value || null,
        oas_score: (document.getElementById('edit-oas_score') || {}).value || null
      };

      const assessUpdate = {
        raw_data: updatedRaw,
        oas_score: updatedRaw.oas_score != null && updatedRaw.oas_score !== '' ? parseInt(updatedRaw.oas_score, 10) : null
      };

      const { error: aerr } = await supabaseClient.from('assessments').update(assessUpdate).eq('id', currentEditAssessment.id);
      if (aerr) {
        console.error('Update assessment error', aerr);
        toast('อัปเดต assessment ล้มเหลว: ' + (aerr.message || ''), true);
        return;
      }
    }

    toast('บันทึกข้อมูลผู้ป่วยเรียบร้อย');
    const editForm = document.getElementById('editpatient-form');
    if (editForm) editForm.reset();
    editForm.classList.add('hidden');
    document.getElementById('editpatient-hn-search').value = '';
    currentEditAssessment = null;
  } catch (e) {
    console.error('saveEditedPatient error', e);
    toast('เกิดข้อผิดพลาดขณะบันทึก', true);
  }
}

// ==========================================
// 5. โลจิกแบบฟอร์มหลายหน้า (หน้าแรกรับ 5 หน้า)
// ==========================================
function initNewPatientSMIV() {
  $('diagnosis').addEventListener('change', e => $('diagnosisOther').classList.toggle('hidden', e.target.value !== 'อื่นๆ'));
  $('admissionSource')?.addEventListener('change', e => $('admissionDateSection').classList.toggle('hidden', !e.target.value));

  document.querySelectorAll('#sv_page2 .radio-card').forEach(card => {
    card.addEventListener('click', () => {
      const input = card.querySelector('input[type="radio"]');
      if (input) input.checked = true;
      card.parentElement.querySelectorAll('.radio-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
    });
  });

  // OAS table rows (sv_page3) - whole row selects the hidden radio
  document.querySelectorAll('#sv_page3 .oas-row').forEach(row => {
    row.addEventListener('click', () => {
      const input = row.querySelector('input[type="radio"]');
      if (input) input.checked = true;
      document.querySelectorAll('#sv_page3 .oas-row').forEach(r => r.classList.remove('selected'));
      row.classList.add('selected');
    });
  });

  // Page1 -> Page2
  $('sv_nextBtn').addEventListener('click', () => {
    const required = ['firstName','lastName','gender','age','hn'];
    const missing = [];
    required.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      if (id === 'admissionDate' && document.getElementById('admissionDateSection')?.classList.contains('hidden')) return;
      if (!String(el.value || '').trim()) missing.push(id);
    });
    if (missing.length) { $('page1Error').textContent = 'กรุณากรอกข้อมูลให้ครบ'; $('page1Error').classList.remove('hidden'); return; }
    $('page1Error').classList.add('hidden');
    $('sv_page1').classList.add('hidden'); $('sv_page2').classList.remove('hidden');
  });

  // Page2 back
  $('sv_backBtn').addEventListener('click', () => { $('sv_page2').classList.add('hidden'); $('sv_page1').classList.remove('hidden'); });

  // กรณีเลือกผลการประเมิน SMI-V
  // - ถ้าเป็น SMI-V ให้ไปหน้าต่อไป (sv_page3)
  // - ถ้าเป็น "ไม่เข้าข่าย SMI-V" ให้ข้ามไปยังหน้า sv_page5 ก่อน แล้วค่อยบันทึกจากหน้าสุดท้าย
  $('sv_submitBtn').addEventListener('click', async () => {
    const sel = document.querySelector('input[name="smiV"]:checked');
    if (!sel) { $('page2Error').textContent = 'กรุณาเลือกผลการประเมิน SMI‑V'; $('page2Error').classList.remove('hidden'); return; }
    $('page2Error').classList.add('hidden');

    if (sel.value !== 'ไม่เข้าข่าย SMI-V') {
      $('sv_page2').classList.add('hidden'); $('sv_page3').classList.remove('hidden');
      return;
    }

    // หากเลือกไม่เข้าข่าย ให้ไปหน้า page4 ก่อน (มีข้อมูลที่ต้องกรอก)
    sv5ReturnTo = 'sv_page2';
    $('sv_page2').classList.add('hidden'); $('sv_page5').classList.remove('hidden');
    return;
  });

  // Page3 back
  $('sv_backTo2Btn').addEventListener('click', () => { $('sv_page3').classList.add('hidden'); $('sv_page2').classList.remove('hidden'); });

  // คำแนะนำการดูแลตามระดับ OAS ที่เลือก (แสดงใน popup ก่อนไปหน้าถัดไป)
  const oasCareContent = {
    '1': {
      title: 'OAS 1 - Semi-urgency (ต้องได้รับการดูแลภายใน 24 ชั่วโมง)',
      html: `<ul style="margin-top:6px;padding-left:18px;">
        <li>✔ พูดคุยสร้างสัมพันธภาพ</li>
        <li>✔ เปิดโอกาสให้ผู้ป่วยได้พูดคุย ระบายอารมณ์ความรู้สึก</li>
        <li>✔ Verbal restraint</li>
        <li>✔ ประเมินซ้ำ</li>
      </ul>`
    },
    '2': {
      title: 'OAS 2 - Urgency (ต้องได้รับการดูแลภายใน 2 ชั่วโมง)',
      html: `<ul style="margin-top:6px;padding-left:18px;">
        <li>✔ จัดสิ่งแวดล้อม/พูดคุยสร้างสัมพันธภาพ</li>
        <li>✔ Verbal restraint</li>
        <li>✔ Physical restraint</li>
        <li>✔ ให้ยา Hadol (5) IM / Valium (10) IV (ตามแผนการรักษาชองแพทย์)</li>
        <li>✔ ประเมินซ้ำหลังได้ยา หากอาการไม่ดีขึ้น renotify แพทย์</li>
        <li>✔ ประเมินต่อเนื่องทุก 4-6 ชั่วโมง</li>
      </ul>`
    },
    '3': {
      title: 'OAS 3 - Emergency (ต้องได้รับการดูแลทันทีหรือภายใน 1 ชั่วโมง)',
      html: `<ul style="margin-top:6px;padding-left:18px;">
        <li>✔ จัดสิ่งแวดล้อมให้ปลอดภัย อยู่ใกล้เคาท์เตอร์พยาบาล</li>
        <li>✔ Physical restraint</li>
        <li>✔ Verbal restraint</li>
        <li>✔ ให้ยา Hadol (5) IM / Valium (10) IV (ตามแผนการรักษาชองแพทย์)</li>
        <li>✔ ประเมินซ้ำหลังได้ยา หากอาการไม่ดีขึ้น renotify แพทย์</li>
        <li>✔ ประเมินต่อเนื่องทุก 4-6 ชั่วโมง</li>
      </ul>`
    }
  };

  // OAS -> แสดง popup คำแนะนำการดูแลก่อน -> Page4
  $('sv_toPage4Btn').addEventListener('click', () => {
    const sel = document.querySelector('input[name="oasScore"]:checked');
    if (!sel) { $('page3Error').textContent = 'กรุณาเลือกคะแนน OAS'; $('page3Error').classList.remove('hidden'); return; }
    $('page3Error').classList.add('hidden');

    const care = oasCareContent[sel.value];
    if (care) {
      $('oasCareModalTitle').textContent = care.title;
      $('oasCareModalBody').innerHTML = care.html;
      $('oasCareModal').classList.remove('hidden');
    } else {
      $('sv_page3').classList.add('hidden'); $('sv_page4').classList.remove('hidden');
    }
  });

  // Popup: ย้อนกลับ -> ปิด popup แล้วอยู่ที่ sv_page3 ต่อ
  $('oasCareBackBtn').addEventListener('click', () => {
    $('oasCareModal').classList.add('hidden');
  });

  // Popup: ไปต่อ -> ปิด popup แล้วไป sv_page4
  $('oasCareContinueBtn').addEventListener('click', () => {
    $('oasCareModal').classList.add('hidden');
    $('sv_page3').classList.add('hidden'); $('sv_page4').classList.remove('hidden');
  });

  // Page4 back - dynamic based on where we came from
  $('sv_backFrom4Btn').addEventListener('click', () => {
    $('sv_page4').classList.add('hidden');
    if (sv4ReturnTo === 'sv_page2') {
      $('sv_page2').classList.remove('hidden');
    } else {
      $('sv_page3').classList.remove('hidden');
    }
    sv4ReturnTo = 'sv_page3';
  });

  // Page4 -> Page5
  $('sv_toPage5Btn').addEventListener('click', () => {
    const aggressiveBehavior = $('aggressiveBehavior').value.trim();
    const substanceUse = $('substanceUse').value;
    const substanceType = $('substanceType').value;
    const readmit28 = $('readmit28').value;
    const admit3times = $('admit3times').value;
    const admitNumber = $('admitNumber').value;
    const missing = [];
    if (!aggressiveBehavior) missing.push('พฤติกรรมรุนแรงที่นำส่ง');
    if (!substanceUse) missing.push('การใช้สารเสพติด/สุรา');
    if (substanceUse === 'ใช้' && !substanceType) missing.push('ประเภทสารเสพติด/สุรา');
    if (!readmit28) missing.push('readmit ใน 28 วัน');
    if (!admit3times) missing.push('Admit มากกว่าหรือเท่ากับ 3 ครั้ง');
    if (admit3times === 'ใช่' && !admitNumber) missing.push('จำนวนครั้ง Admit');


    if (missing.length) { $('page4Error').textContent = 'กรุณากรอกข้อมูลให้ครบ: ' + missing.join(', '); $('page4Error').classList.remove('hidden'); return; }
    $('page4Error').classList.add('hidden');
    // mark that page5 should return to page4 in this flow
    sv5ReturnTo = 'sv_page4';
    $('sv_page4').classList.add('hidden'); $('sv_page5').classList.remove('hidden');
  });

  // Page5 back - return to where we came from (page4 or page2)
  $('sv_backFrom5Btn').addEventListener('click', () => {
    $('sv_page5').classList.add('hidden');
    if (sv5ReturnTo === 'sv_page2') {
      $('sv_page2').classList.remove('hidden');
    } else {
      $('sv_page4').classList.remove('hidden');
    }
    sv5ReturnTo = null;
  });

  // toggles
  $('residenceTypeSelect').addEventListener('change', (e) => {
    const isRenting = e.target.value === 'มีที่อยู่เป็นหลักแหล่ง';
    $('addressSection').classList.toggle('hidden', !isRenting);
  });
  $('residenceDistrict').addEventListener('change', (e) => {
    $('subdistrictSection').classList.add('hidden'); $('otherDistrictSection').classList.add('hidden');
    if (e.target.value === 'ในเขตอำเภอเมืองชลบุรี') $('subdistrictSection').classList.remove('hidden');
    else if (e.target.value === 'นอกเขตอำเภอเมืองชลบุรี') $('otherDistrictSection').classList.remove('hidden');
  });
  $('caregiverStatusSelect').addEventListener('change', (e) => {
    const hasCaregiver = e.target.value !== 'อยู่คนเดียว';
    $('caregiverDetailsSection').classList.toggle('hidden', !hasCaregiver);
    $('patientPhoneSection').classList.toggle('hidden', hasCaregiver);
  });
  $('caregiverRelationInput').addEventListener('change', (e) => { $('caregiverRelationOther').classList.toggle('hidden', e.target.value !== 'อื่นๆ'); });
  $('substanceUse').addEventListener('change', (e) => { $('substanceTypeDiv').classList.toggle('hidden', e.target.value !== 'ใช้'); });
  $('admit3times').addEventListener('change', (e) => { $('admitNumberDiv').classList.toggle('hidden', e.target.value !== 'ใช่'); });

  // final submit (page5)
  $('sv_submitAllBtn').addEventListener('click', async () => {
    const residenceType = $('residenceTypeSelect').value;
    if (!residenceType) { $('page5Error').textContent = 'กรุณาเลือกสถานภาพที่อยู่'; $('page5Error').classList.remove('hidden'); return; }
    if (residenceType === 'เร่ร่อน/อยู่สถานสงเคราะห์') { await submitFinalData(residenceType, '', '', '', '', '', '', ''); return; }
    
    const residenceDistrict = $('residenceDistrict').value;
    if (!residenceDistrict) { $('page5Error').textContent = 'กรุณาเลือกเขตที่อยู่'; $('page5Error').classList.remove('hidden'); return; }
    
    let residenceLocation = '';
    if (residenceDistrict === 'ในเขตอำเภอเมืองชลบุรี') {
      residenceLocation = $('residenceSubdistrict').value;
      if (!residenceLocation) { $('page5Error').textContent = 'กรุณาเลือกตำบล'; $('page5Error').classList.remove('hidden'); return; }
    } else if (residenceDistrict === 'นอกเขตอำเภอเมืองชลบุรี') {
      residenceLocation = $('residenceOtherDistrict').value;
      if (!residenceLocation) { $('page5Error').textContent = 'กรุณาเลือกอำเภอ'; $('page5Error').classList.remove('hidden'); return; }
    }

    const residenceDetails = $('residenceDetails').value.trim();
    if (!residenceDetails) { $('page5Error').textContent = 'กรุณากรอกรายละเอียดที่อยู่'; $('page5Error').classList.remove('hidden'); return; }

    const caregiverStatus = $('caregiverStatusSelect').value;
    if (!caregiverStatus) { $('page5Error').textContent = 'กรุณาเลือกสถานภาพผู้ดูแล'; $('page5Error').classList.remove('hidden'); return; }

    let caregiverName = '', caregiverRelation = '', caregiverPhone = '', patientPhone = '';
    if (caregiverStatus === 'อยู่คนเดียว') {
      patientPhone = $('patientPhoneInput').value.trim();
      if (!patientPhone) { $('page5Error').textContent = 'กรุณากรอกเบอร์โทรศัพท์ผู้ป่วย'; $('page5Error').classList.remove('hidden'); return; }
    } else {
      caregiverName = $('caregiverNameInput').value.trim();
      if (!caregiverName) { $('page5Error').textContent = 'กรุณากรอกชื่อผู้ดูแล'; $('page5Error').classList.remove('hidden'); return; }
      const rel = $('caregiverRelationInput').value;
      caregiverRelation = rel === 'อื่นๆ' ? $('caregiverRelationOther').value.trim() : rel;
      caregiverPhone = $('caregiverPhoneInput').value.trim();
      if (!caregiverRelation || !caregiverPhone) { $('page5Error').textContent = 'กรุณากรอกข้อมูลผู้ดูแลให้ครบ'; $('page5Error').classList.remove('hidden'); return; }
    }

    // ตรวจสอบฟิลด์ใหม่ (ย้ายมาจาก page1)
    if (!$('diagnosis').value) missing.push('การวินิจฉัยโรคแรกรับ');
    if ($('diagnosis').value === 'อื่นๆ' && !$('diagnosisOther').value.trim()) missing.push('ระบุการวินิจฉัยอื่นๆ');
    if (!$('admissionSource').value) missing.push('รับ Admit');
    if ($('admissionSource').value && $('admissionDateSection') && !$('admissionDateSection').classList.contains('hidden') && !$('admissionDate').value) missing.push('วันที่เข้ารับการรักษา');
    if (!$('admittingDoctor').value) missing.push('นายแพทย์ผู้รับ');

    $('page5Error').classList.add('hidden');
    await submitFinalData(residenceType, residenceDistrict, residenceLocation, residenceDetails, caregiverStatus, caregiverName, caregiverRelation, caregiverPhone, patientPhone);
  });
}

// -----------------------------------------
// จัดการข้อมูลส่งให้ Supabase (ฟอร์มยาว)
// -----------------------------------------
async function submitFinalData(residenceType, district, location, details, caregiverStatus, caregiverName, caregiverRelation, caregiverPhone, patientPhone = '') {
  const smiVSelected = document.querySelector('input[name="smiV"]:checked');
  const selectedOas = document.querySelector('input[name="oasScore"]:checked');
  const diagVal = document.getElementById('diagnosis').value;
  const riskLevelMap = { '0': 'Low Risk', '1': 'Semi-urgency', '2': 'Urgency', '3': 'Emergency' };

  const record = {
    first_name: $('firstName').value, last_name: $('lastName').value,
    gender: $('gender').value, age: $('age').value, hn: $('hn').value,
    diagnosis: diagVal === 'อื่นๆ' ? $('diagnosisOther').value : diagVal,
    admission_source: $('admissionSource') ? $('admissionSource').value : '',
    admission_date: $('admissionDate') ? $('admissionDate').value : '',
    admitting_doctor: $('admittingDoctor') ? $('admittingDoctor').value : '',
    smi_v_result: smiVSelected ? smiVSelected.value : '',
    is_smi_v: !!smiVSelected && smiVSelected.value !== 'ไม่เข้าข่าย SMI-V',
    oas_score: selectedOas ? selectedOas.value : '',
    oas_risk_level: selectedOas ? (riskLevelMap[selectedOas.value] || '') : '',
    aggressive_behavior: $('aggressiveBehavior') ? $('aggressiveBehavior').value : '',
    substance_use: $('substanceUse') ? $('substanceUse').value : '',
    substance_type: $('substanceUse') && $('substanceUse').value === 'ใช้' ? $('substanceType').value : '',
    residence_type: residenceType, residence_district: district, residence_subdistrict: location, residence_details: details,
    caregiver_status: caregiverStatus, caregiver_name: caregiverName, caregiver_relation: caregiverRelation, caregiver_phone: caregiverPhone, patient_phone: patientPhone
  };

  $('sv_submitAllBtn').disabled = true; $('sv_submitAllBtn').textContent = 'กำลังบันทึก...';
  
  const okP = await syncPatientProfileToSupabase(record);
  if (okP) {
    const okA = await saveAssessmentToSupabase(record, 'smi-v_admission');
    if (okA) showFinalResult(record);
  }
  
  $('sv_submitAllBtn').disabled = false; $('sv_submitAllBtn').textContent = 'บันทึกข้อมูล';
}

function showResult(record) {
  const resultEl = document.getElementById('page-result');
  if (!resultEl) return;
  resultEl.innerHTML = `
    <div class="card">
      <h2 style="color:#16a34a">ไม่เข้าข่าย SMI-V (บันทึกสำเร็จ)</h2>
      <div style="margin-top:12px;">
        <p><strong>ชื่อ:</strong> ${record.first_name} ${record.last_name}</p>
        <p><strong>HN:</strong> ${record.hn}</p>
        <p><strong>ผลประเมิน:</strong> ${record.smi_v_result}</p>
      </div>
      <div style="margin-top:12px;"><button class="btn" onclick="showPage('home')">กลับหน้าหลัก</button></div>
    </div>`;
    
  resetNewPatientForm();

  showPage('result');
}

function showFinalResult(record) {
  const resultEl = document.getElementById('page-result');
  if (!resultEl) return;
  resultEl.innerHTML = `
    <div class="card">
      <h2 style="color:#16a34a">บันทึกประเมินเรียบร้อย (Supabase)</h2>
      <div style="margin-top:12px;">
        <p><strong>ชื่อ:</strong> ${record.first_name} ${record.last_name}</p>
        <p><strong>HN:</strong> ${record.hn}</p>
        <p><strong>OAS Score:</strong> ${record.oas_score}</p>
      </div>
      <div style="margin-top:12px;"><button class="btn" onclick="showPage('home')">กลับหน้าหลัก</button></div>
    </div>`;
  
  resetNewPatientForm();

  showPage('result');
}

// -----------------------------------------
// ฟอร์มลงทะเบียนแบบสั้น (SMI-V)
// -----------------------------------------
async function submitRegister() {
  const hn = $('reg-hn').value.trim(); const prefix = $('reg-prefix').value;
  const name = $('reg-name').value.trim(); const gender = $('reg-gender').value;
  const ageVal = $('reg-age').value; const smi = $('reg-smi').value;
  const substance = $('reg-substance').value; const date = $('reg-date').value;

  if (!hn || !prefix || !name || !gender || !ageVal || !smi || !substance || !date) { toast('กรุณากรอกข้อมูลให้ครบ', true); return; }

  const btn = $('reg-btn'); btn.disabled = true; btn.textContent = 'กำลังบันทึก...';
  
  const record = { hn, prefix, full_name: name, gender, age: ageVal, smi_v_result: smi, substance_use: substance, admission_date: date };
  const ok = await syncPatientProfileToSupabase(record);
  if (ok) { toast('ลงทะเบียนสำเร็จ'); $('reg-form').reset(); }
  
  btn.disabled = false; btn.textContent = 'บันทึกลงทะเบียน';
}

// -----------------------------------------
// การประเมินรายเวร (ระบบคำนวณและประเมินผลตัวเดิม)
// -----------------------------------------
let currentAssessHN = '';

const PHUA_ITEMS = ['รู้สึกหวาดระแวงว่ามีคนมุ่งร้าย','ความรู้สึกไม่เป็นมิตร','ไม่ร่วมมือในการรักษา','อาการตื่นเต้นกระวนกระวาย'];
const GHARD_ITEMS = ['ความรู้สึกผิด','ประสาทหลอน','อาการตื่นเต้นกระวนกระวาย','การเคลื่อนไหวเชื่องช้า','อารมณ์ซึมเศร้า'];

function buildScaleTable(containerId, prefix, items) {
  const c = document.getElementById(containerId);
  if (!c) return;
  const values = [1,3,5,7];
  c.innerHTML = `
    <table class="assess-table">
      <thead><tr><th style="text-align:left">หัวข้อประเมิน</th>${values.map(v => `<th>${v}</th>`).join('')}</tr></thead>
      <tbody class="assess-items">${items.map((item, i) => `<tr><td style="text-align:left;padding:10px 8px">${i+1}. ${item}</td>${values.map(v => `<td><input type="radio" name="${prefix}_${i}" value="${v}"></td>`).join('')}</tr>`).join('')}</tbody>
    </table>`;
}

function calculateRisk(scores) {
  const count7 = scores.filter(s => s === 7).length;
  const count5 = scores.filter(s => s === 5).length;
  if (count7 >= 1 || count5 >= 3) return 'Critical';
  if (count5 === 2) return 'Severe';
  if (count5 === 1) return 'Moderate';
  return 'Mild';
}
function getRiskColor(cat) { const c = { 'Critical':'#dc2626', 'Severe':'#f97316', 'Moderate':'#f59e0b', 'Mild':'#10b981' }; return c[cat]||'#64748b'; }

async function submitAssess() {
  const date = $('a-date').value; const shift = $('a-shift').value;
  const oasEl = document.querySelector('input[name="oas"]:checked');
  if (!currentAssessHN) { toast('กรุณาเลือกผู้ป่วยจากรายชื่อก่อน', true); return; }
  if (!date || !shift || !oasEl) { toast('กรุณากรอกข้อมูลให้ครบ', true); return; }

  const phua = [], ghard = [];
  for (let i=0;i<PHUA_ITEMS.length;i++) {
    const el = document.querySelector(`input[name="phua_${i}"]:checked`);
    if (!el) { toast('กรุณาประเมิน PHUA ให้ครบ', true); return; }
    phua.push(parseInt(el.value));
  }
  for (let i=0;i<GHARD_ITEMS.length;i++) {
    const el = document.querySelector(`input[name="ghard_${i}"]:checked`);
    if (!el) { toast('กรุณาประเมิน G-HARD ให้ครบ', true); return; }
    ghard.push(parseInt(el.value));
  }

  const pRisk = calculateRisk(phua); const gRisk = calculateRisk(ghard);
  $('phua-result').style.display = 'block'; $('phua-result').innerHTML = `<div style="color:${getRiskColor(pRisk)}">PHUA Risk: ${pRisk}</div>`;
  $('ghard-result').style.display = 'block'; $('ghard-result').innerHTML = `<div style="color:${getRiskColor(gRisk)}">G-HARD Risk: ${gRisk}</div>`;

  $('assess-btn').disabled = true; $('assess-btn').textContent = 'กำลังบันทึก...';
  
  const record = { hn: currentAssessHN, assess_date: date, shift, oas_score: oasEl.value, phua_risk: pRisk, ghard_risk: gRisk, phua_scores: phua, ghard_scores: ghard };
  const ok = await saveAssessmentToSupabase(record, 'shift_assessment');
  if (ok) { toast('บันทึกผลสำเร็จ'); $('assess-form').reset(); currentAssessHN = ''; $('patient-info-card').style.display = 'none'; $('assess-form').style.display='none'; }
  
  $('assess-btn').disabled = false; $('assess-btn').textContent = 'บันทึกผลประเมิน';
}

// ---- Admission Statistics ----

let admissionData = { male: [], female: [] };

// แทนที่ฟังก์ชัน loadAdmissionData เดิมทั้งหมด
async function loadAdmissionData(gender) {
  const genderLabel = gender === 'male' ? 'ชาย' : 'หญิง';

  const [{ data: assessData, error: err1 }, { data: backupData, error: err2 }] = await Promise.all([
    supabaseClient.from('assessments').select('raw_data').not('raw_data', 'is', null),
    supabaseClient.from('backup').select('id, raw_data').not('raw_data', 'is', null)
  ]);

  if (err1) console.error('assessments error:', err1);
  if (err2) console.error('backup error:', err2);

  // assessments: dedup ด้วย hn+admission_date เฉพาะในตัวเอง
  const assessSeen = new Set();
  const fromAssess = (assessData || [])
    .map(r => r.raw_data)
    .filter(r => {
      if (!r || !r.admission_date) return false;
      const key = `${r.hn}_${r.admission_date}`;
      if (assessSeen.has(key)) return false;
      assessSeen.add(key);
      return true;
    });

  // backup: ทุกแถวขึ้นหมด ไม่ dedup เลย
  const fromBackup = (backupData || [])
    .filter(r => r.raw_data && (r.raw_data.admission_date || r.raw_data?.admit_date))
    .map(r => ({ ...r.raw_data, _backup_id: r.id }));

  return [...fromAssess, ...fromBackup].filter(r => r && r.gender === genderLabel);
}

async function initAdmissionPage(gender) {
  const rows = await loadAdmissionData(gender);
  admissionData[gender] = rows;

  // สร้าง year options จากข้อมูล
  const years = [...new Set(rows.map(r => {
    if (!r.admission_date) return null;
    const d = new Date(r.admission_date);
    return d.getFullYear() + 543; // แปลงเป็น พ.ศ.
  }).filter(Boolean))].sort((a, b) => b - a);

  const yearSel = document.getElementById(`${gender}-adm-year`);
  yearSel.innerHTML = '<option value="">ทั้งหมด</option>';
  years.forEach(y => {
    const opt = document.createElement('option');
    opt.value = y;
    opt.textContent = y;
    yearSel.appendChild(opt);
  });

  filterAdmission(gender);
}

function filterAdmission(gender) {
  const month = document.getElementById(`${gender}-adm-month`).value;
  const year  = document.getElementById(`${gender}-adm-year`).value;
  const smiv  = document.getElementById(`${gender}-adm-smiv`).value;
  const res   = document.getElementById(`${gender}-adm-residence`).value;

  let rows = admissionData[gender] || [];

  if (month || year) {
    rows = rows.filter(r => {
      if (!r.admission_date && !r.admit_date) return false;
      const d = new Date(r.admission_date || r.admit_date);
      const rowMonth = d.getMonth() + 1;
      const rowYear  = d.getFullYear() + 543;
      if (month && rowMonth !== parseInt(month)) return false;
      if (year  && rowYear  !== parseInt(year))  return false;
      return true;
    });
  }

  if (smiv) {
    rows = rows.filter(r => r.smi_v_result === smiv);
  }

  if (res) {
    if (res === 'เร่ร่อน') {
      rows = rows.filter(r => r.residence_type && r.residence_type.includes('เร่ร่อน'));
    } else {
      rows = rows.filter(r => r.residence_district === res);
    }
  }

  renderAdmissionTable(gender, rows);
}

// แทนที่ฟังก์ชัน renderAdmissionTable เดิมทั้งหมด
function renderAdmissionTable(gender, rows) {
  const tbody = document.getElementById(`${gender}-adm-tbody`);
  const summary = document.getElementById(`${gender}-adm-summary`);

  summary.textContent = `ยอดรวมผู้ป่วยรับใหม่: ${rows.length} ราย`;

  tbody.innerHTML = rows.map(r => {
    const admitDate = (r.admission_date || r.admit_date)
      ? (() => { const d = new Date(r.admission_date || r.admit_date); return `${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()+543}`; })()
      : '-';
    const substanceDisplay = (r.substance_type && r.substance_type.trim() !== '') ? r.substance_type : 'ไม่ใช้';
    return `
      <tr style="border-bottom:1px solid #eee;">
        <td style="padding:7px 8px; border:1px solid #eee;">${admitDate}</td>
        <td style="padding:7px 8px; border:1px solid #eee;">${r.hn || '-'}</td>
        <td style="padding:7px 8px; border:1px solid #eee;">${(`${r.first_name || ''} ${r.last_name || ''}`.trim() || r.full_name || '-').trim()}</td>
        <td style="padding:7px 8px; border:1px solid #eee;">${r.diagnosis || '-'}</td>
        <td style="padding:7px 8px; border:1px solid #eee;">${r.smi_v_result || '-'}</td>
        <td style="padding:7px 8px; border:1px solid #eee;">${substanceDisplay}</td>
        <td style="padding:7px 8px; border:1px solid #eee;">${r.admitting_doctor || '-'}</td>
        <td style="padding:7px 8px; border:1px solid #eee;">${r.residence_details || '-'}</td>
      </tr>`;
  }).join('');
}

function exportAdmissionExcel(gender) {
  const table = document.getElementById(`${gender}-adm-table`);
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.table_to_sheet(table);
  const sheetName = gender === 'male' ? 'รับใหม่ชาย' : 'รับใหม่หญิง';
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `สถิติผู้ป่วย${sheetName}.xlsx`);
}

// ---- Discharge Statistics ----

let dischargeData = { male: [], female: [] };

async function loadDischargeData(gender) {
  const genderLabel = gender === 'male' ? 'ชาย' : 'หญิง';

  const { data, error } = await supabaseClient
    .from('backup')
    .select('id, raw_data, discharge_date, discharge_type, last_diagnosis, smi_type, admitting_doctor, full_name, hn, gender')
    .eq('gender', genderLabel)
    .not('discharge_date', 'is', null);

  if (error) { console.error('backup discharge error:', error); return []; }

  return (data || []).map(r => ({
    _id: r.id,
    hn: r.hn,
    gender: r.gender,
    full_name: r.full_name,
    discharge_date: r.discharge_date,
    discharge_type: r.discharge_type,
    last_diagnosis: r.last_diagnosis,
    smi_type: r.smi_type,
    admitting_doctor: r.admitting_doctor,
    // ดึงจาก raw_data สำหรับฟิลด์ที่ละเอียดกว่า
    first_name: r.raw_data?.first_name || '',
    last_name: r.raw_data?.last_name || '',
    substance_type: r.raw_data?.substance_type || '',
    residence_details: r.raw_data?.residence_details || '',
    residence_district: r.raw_data?.residence_district || '',
    residence_type: r.raw_data?.residence_type || '',
  }));
}

async function initDischargePage(gender) {
  const rows = await loadDischargeData(gender);
  dischargeData[gender] = rows;

  const years = [...new Set(rows.map(r => {
    if (!r.discharge_date) return null;
    const d = new Date(r.discharge_date);
    return d.getFullYear() + 543;
  }).filter(Boolean))].sort((a, b) => b - a);

  const yearSel = document.getElementById(`${gender}-dis-year`);
  yearSel.innerHTML = '<option value="">ทั้งหมด</option>';
  years.forEach(y => {
    const opt = document.createElement('option');
    opt.value = y;
    opt.textContent = y;
    yearSel.appendChild(opt);
  });

  filterDischarge(gender);
}

function filterDischarge(gender) {
  const month = document.getElementById(`${gender}-dis-month`).value;
  const year  = document.getElementById(`${gender}-dis-year`).value;
  const smiv  = document.getElementById(`${gender}-dis-smiv`).value;
  const res   = document.getElementById(`${gender}-dis-residence`).value;

  let rows = dischargeData[gender] || [];

  if (month || year) {
    rows = rows.filter(r => {
      if (!r.discharge_date) return false;
      const d = new Date(r.discharge_date);
      const rowMonth = d.getMonth() + 1;
      const rowYear  = d.getFullYear() + 543;
      if (month && rowMonth !== parseInt(month)) return false;
      if (year  && rowYear  !== parseInt(year))  return false;
      return true;
    });
  }

  if (smiv) {
    rows = rows.filter(r => r.smi_type === smiv);
  }

  if (res) {
    if (res === 'เร่ร่อน') {
      rows = rows.filter(r => r.residence_type && r.residence_type.includes('เร่ร่อน'));
    } else {
      rows = rows.filter(r => r.residence_district === res);
    }
  }

  renderDischargeTable(gender, rows);
}

function renderDischargeTable(gender, rows) {
  const tbody = document.getElementById(`${gender}-dis-tbody`);
  const summary = document.getElementById(`${gender}-dis-summary`);

  summary.textContent = `ยอดรวมผู้ป่วยจำหน่าย: ${rows.length} ราย`;

  tbody.innerHTML = rows.map(r => {
    const disDate = r.discharge_date
      ? (() => { const d = new Date(r.discharge_date); return `${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()+543}`; })()
      : '-';
    const fullName = (r.first_name || r.last_name)
      ? `${r.first_name} ${r.last_name}`.trim()
      : (r.full_name || '-');
    const substanceDisplay = (r.substance_type && r.substance_type.trim() !== '') ? r.substance_type : 'ไม่ใช้';
    return `
      <tr style="border-bottom:1px solid #eee;">
        <td style="padding:7px 8px; border:1px solid #eee;">${disDate}</td>
        <td style="padding:7px 8px; border:1px solid #eee;">${r.hn || '-'}</td>
        <td style="padding:7px 8px; border:1px solid #eee;">${fullName}</td>
        <td style="padding:7px 8px; border:1px solid #eee;">${r.last_diagnosis || '-'}</td>
        <td style="padding:7px 8px; border:1px solid #eee;">${r.smi_type || '-'}</td>
        <td style="padding:7px 8px; border:1px solid #eee;">${substanceDisplay}</td>
        <td style="padding:7px 8px; border:1px solid #eee;">${r.admitting_doctor || '-'}</td>
        <td style="padding:7px 8px; border:1px solid #eee;">${r.discharge_type || '-'}</td>
        <td style="padding:7px 8px; border:1px solid #eee;">${r.residence_details || '-'}</td>
      </tr>`;
  }).join('');
}

function exportDischargeExcel(gender) {
  const table = document.getElementById(`${gender}-dis-table`);
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.table_to_sheet(table);
  const sheetName = gender === 'male' ? 'จำหน่ายชาย' : 'จำหน่ายหญิง';
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `สถิติผู้ป่วย${sheetName}.xlsx`);
}

function exportDischargeExcel(gender) {
  const table = document.getElementById(`${gender}-dis-table`);
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.table_to_sheet(table);
  const sheetName = gender === 'male' ? 'จำหน่ายชาย' : 'จำหน่ายหญิง';
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `สถิติผู้ป่วย${sheetName}.xlsx`);
}

// ---- Incident Statistics (IOR : SMI-V) ----

let incidentStatData = [];

async function loadIncidentData() {
  const { data: iorData, error: err1 } = await supabaseClient
    .from('ior_records')
    .select('hn, record_date, level');

  if (err1) { console.error('ior_records error:', err1); return []; }

  const hns = [...new Set((iorData || []).map(r => r.hn).filter(Boolean))];
  if (hns.length === 0) return [];

  const { data: patData, error: err2 } = await supabaseClient
    .from('patients')
    .select('hn, full_name, gender, smi_type')
    .in('hn', hns);

  if (err2) { console.error('patients error:', err2); return []; }

  const patMap = {};
  (patData || []).forEach(p => { patMap[p.hn] = p; });

  return (iorData || []).map(r => ({
    hn: r.hn,
    record_date: r.record_date,
    level: r.level,
    full_name: patMap[r.hn]?.full_name || '-',
    gender: patMap[r.hn]?.gender || '',
    smi_type: patMap[r.hn]?.smi_type || '-',
  }));
}

async function initIncidentStatistics() {
  const rows = await loadIncidentData();
  incidentStatData = rows;

  const years = [...new Set(rows.map(r => {
    if (!r.record_date) return null;
    const d = new Date(r.record_date);
    return d.getFullYear() + 543;
  }).filter(Boolean))].sort((a, b) => b - a);

  const yearSel = document.getElementById('ior-stat-year');
  yearSel.innerHTML = '<option value="">ทั้งหมด</option>';
  years.forEach(y => {
    const opt = document.createElement('option');
    opt.value = y;
    opt.textContent = y;
    yearSel.appendChild(opt);
  });

  filterIncidentStatistics();
}

function filterIncidentStatistics() {
  const month  = document.getElementById('ior-stat-month').value;
  const year   = document.getElementById('ior-stat-year').value;
  const gender = document.getElementById('ior-stat-gender').value;

  let rows = incidentStatData || [];

  if (month || year) {
    rows = rows.filter(r => {
      if (!r.record_date) return false;
      const d = new Date(r.record_date);
      const rowMonth = d.getMonth() + 1;
      const rowYear  = d.getFullYear() + 543;
      if (month && rowMonth !== parseInt(month)) return false;
      if (year  && rowYear  !== parseInt(year))  return false;
      return true;
    });
  }

  if (gender) {
    rows = rows.filter(r => r.gender === gender);
  }

  renderIncidentTable(rows);
}

function renderIncidentTable(rows) {
  const tbody   = document.getElementById('ior-stat-tbody');
  const summary = document.getElementById('ior-stat-summary');

  summary.textContent = `ยอดผู้ป่วยอุบัติการณ์: ${rows.length} ราย`;

  tbody.innerHTML = rows.map(r => `
    <tr style="border-bottom:1px solid #eee;">
      <td style="padding:7px 8px; border:1px solid #eee;">${r.hn || '-'}</td>
      <td style="padding:7px 8px; border:1px solid #eee;">${r.full_name || '-'}</td>
      <td style="padding:7px 8px; border:1px solid #eee;">${r.smi_type || '-'}</td>
      <td style="padding:7px 8px; border:1px solid #eee; text-align: center;">${r.level || '-'}</td>
    </tr>
  `).join('');
}

function exportIncidentExcel() {
  const table = document.getElementById('ior-stat-table');
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.table_to_sheet(table);
  XLSX.utils.book_append_sheet(wb, ws, 'สถิติอุบัติการณ์ IOR');
  XLSX.writeFile(wb, 'สถิติผู้ป่วยอุบัติการณ์_IOR.xlsx');
}