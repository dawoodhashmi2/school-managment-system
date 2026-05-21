// ================================================================
// EDUTRACK — SCHOOL MANAGEMENT SYSTEM
// app.js — Core: Auth, Navigation, Utilities
// ================================================================

// ---- GLOBAL STATE ----
window.APP = {
  currentUser: null,
  currentPortal: null, // 'admin' | 'teacher' | 'student'
};

// ---- STORAGE HELPERS ----
const DB = {
  get: (k, def = []) => { try { return JSON.parse(localStorage.getItem('et_'+k)) ?? def; } catch { return def; } },
  set: (k, v) => localStorage.setItem('et_'+k, JSON.stringify(v)),
  getObj: (k, def = {}) => { try { return JSON.parse(localStorage.getItem('et_'+k)) ?? def; } catch { return def; } },
};

// ---- UTILS ----
const Utils = {
  genId: () => Date.now().toString(36) + Math.random().toString(36).substr(2,5),
  fmtDate: (d) => d ? new Date(d).toLocaleDateString('en-PK',{day:'2-digit',month:'short',year:'numeric'}) : '-',
  getGrade: (pct) => pct>=90?'A+':pct>=80?'A':pct>=70?'B':pct>=60?'C':pct>=50?'D':'F',
  gradeClass: (pct) => pct>=70?'grade-A':pct>=60?'grade-B':pct>=50?'grade-C':'grade-F',
  todayStr: () => new Date().toISOString().split('T')[0],
  avatar: (name) => {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length-1][0]).toUpperCase();
    return parts[0][0].toUpperCase();
  },
  imgOrAvatar: (photo, name, size=38) => photo
    ? `<img src="${photo}" alt="${name}" style="width:${size}px;height:${size}px;border-radius:50%;object-fit:cover">`
    : `<div style="width:${size}px;height:${size}px;background:linear-gradient(135deg,var(--accent),#7c3aed);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:${Math.floor(size/2.8)}px;font-weight:700;color:#fff;flex-shrink:0">${Utils.avatar(name)}</div>`,
};

// ---- TOAST ----
function toast(msg, type = 'success') {
  const icons = { success:'✅', error:'❌', info:'ℹ️' };
  const el = document.createElement('div');
  el.className = `alert-toast ${type}`;
  el.innerHTML = `<span>${icons[type]||'📢'}</span><span>${msg}</span><button class="toast-close">✕</button>`;
  document.body.appendChild(el);
  el.querySelector('.toast-close').addEventListener('click', () => el.remove());
  setTimeout(() => { el.style.opacity='0'; el.style.transition='opacity .3s'; setTimeout(()=>el.remove(),300); }, 3800);
}

// ---- CONFIRM ----
function confirmDialog(msg, onOk, btnTxt='Delete') {
  document.getElementById('confirmMsg').textContent = msg;
  document.getElementById('confirmOk').textContent = btnTxt;
  const m = new bootstrap.Modal(document.getElementById('confirmModal'));
  document.getElementById('confirmOk').onclick = () => { m.hide(); onOk(); };
  m.show();
}

// ---- SEED DEFAULT DATA ----
function seedDefaultData() {
  if (!DB.get('classes').length) {
    DB.set('classes', ['Nursery','KG','1st','2nd','3rd','4th','5th','6th','7th','8th','9th','10th'].map((n,i)=>({id:'cls-'+i,name:n})));
  }
  if (!DB.get('subjects').length) {
    DB.set('subjects', ['English','Mathematics','Urdu','Science','Computer','Islamiyat','Social Studies','Physics','Chemistry','Biology'].map((n,i)=>({id:'sub-'+i,name:n})));
  }
  // Seed demo accounts
  const admins = DB.get('admins', null);
  if (!admins) {
    DB.set('admins', [{ id:'admin-1', name:'Admin User', username:'admin', password:'admin123', email:'admin@hbhs.edu.pk' }]);
  }
  // Seed demo teachers — directly write to localStorage to bypass DB.get caching issues
  (function() {
    try {
      var _t = localStorage.getItem('et_teachers');
      var _parsed = _t ? JSON.parse(_t) : null;
      if (!_parsed || !Array.isArray(_parsed) || _parsed.length === 0) {
        var _demo = [
          { id:'tch-1', name:'Zara Fatima',   phone:'0300-1234567', email:'zara@hbhs.edu.pk',   subject:'English',     cls:'5th', username:'zara',   password:'teacher123', photo:'', qualification:'M.A English',    createdAt: Date.now() },
          { id:'tch-2', name:'Ahmed Raza',    phone:'0311-2345678', email:'ahmed@hbhs.edu.pk',  subject:'Mathematics', cls:'8th', username:'ahmed',  password:'teacher123', photo:'', qualification:'M.Sc Maths',    createdAt: Date.now() },
          { id:'tch-3', name:'Sana Malik',    phone:'0333-3456789', email:'sana@hbhs.edu.pk',   subject:'Science',     cls:'6th', username:'sana',   password:'teacher123', photo:'', qualification:'M.Sc Physics',  createdAt: Date.now() },
          { id:'tch-4', name:'Bilal Hussain', phone:'0321-4567890', email:'bilal@hbhs.edu.pk',  subject:'Urdu',        cls:'4th', username:'bilal',  password:'teacher123', photo:'', qualification:'M.A Urdu',      createdAt: Date.now() },
          { id:'tch-5', name:'Nadia Shaikh',  phone:'0345-5678901', email:'nadia@hbhs.edu.pk',  subject:'Computer',    cls:'9th', username:'nadia',  password:'teacher123', photo:'', qualification:'MCS',            createdAt: Date.now() },
          { id:'tch-6', name:'Tariq Mehmood', phone:'0312-6789012', email:'tariq@hbhs.edu.pk',  subject:'Islamiyat',   cls:'7th', username:'tariq',  password:'teacher123', photo:'', qualification:'M.A Islamiyat', createdAt: Date.now() }
        ];
        localStorage.setItem('et_teachers', JSON.stringify(_demo));
      }
    } catch(e) {}
  })();
  if (!DB.get('notices').length) {
    DB.set('notices', [
      { id:Utils.genId(), title:'Annual Exams Schedule Released', content:'Annual exams will start from 15th March 2025. All students must prepare accordingly.', date:Utils.todayStr(), type:'urgent', audience:'all' },
      { id:Utils.genId(), title:'Welcome to Hira Baitul Hamd System', content:'Hira Baitul Hamd School Management System ab live hai. Tamam portals functional hain.', date:Utils.todayStr(), type:'normal', audience:'all' },
    ]);
  }
}

// ================================================================
// AUTH SYSTEM
// ================================================================
const Auth = (() => {
  function showPortalSelect() {
    document.getElementById('portal-select-screen').style.display = 'flex';
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app-shell').style.display = 'none';
  }

  function showLogin(portal) {
    APP.currentPortal = portal;
    document.getElementById('portal-select-screen').style.display = 'none';
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('app-shell').style.display = 'none';

    const badge = document.getElementById('login-portal-badge');
    const title = document.getElementById('login-title');
    const subtitle = document.getElementById('login-subtitle');
    const hint = document.getElementById('login-hint');
    badge.className = `login-portal-badge ${portal}`;
    const icons = { admin:'🔐', teacher:'👩‍🏫', student:'🎓' };
    badge.innerHTML = `${icons[portal]} ${portal.charAt(0).toUpperCase()+portal.slice(1)} Portal`;
    if (portal === 'admin') {
      title.textContent = 'Admin Login';
      subtitle.textContent = 'Sign in to manage the school system';
      hint.innerHTML = `Default: <strong>admin / admin123</strong>`;
    } else if (portal === 'teacher') {
      title.textContent = 'Teacher Login';
      subtitle.textContent = 'Sign in to access your classes & students';
      hint.innerHTML = `Use your <strong>username & password</strong> (set by Admin)`;
    } else {
      title.textContent = 'Student Login';
      subtitle.textContent = 'Sign in to view your profile, marks & attendance';
      hint.innerHTML = `Use your <strong>Roll Number</strong> as username & password`;
    }
    document.getElementById('login-user').value = '';
    document.getElementById('login-pass').value = '';
  }

  function doLogin() {
    const user = document.getElementById('login-user').value.trim();
    const pass = document.getElementById('login-pass').value.trim();
    if (!user || !pass) { toast('Enter username and password.', 'error'); return; }

    const portal = APP.currentPortal;
    let found = null;

    if (portal === 'admin') {
      const admins = DB.get('admins');
      found = admins.find(a => a.username === user && a.password === pass);
    } else if (portal === 'teacher') {
      const teachers = DB.get('teachers');
      found = teachers.find(t => t.username === user && t.password === pass);
    } else if (portal === 'student') {
      const students = DB.get('students');
      // roll number as username, roll number as password
      found = students.find(s => s.roll.toLowerCase() === user.toLowerCase() && s.roll.toLowerCase() === pass.toLowerCase());
      if (!found) found = students.find(s => (s.username||s.roll).toLowerCase() === user.toLowerCase() && (s.password||s.roll).toLowerCase() === pass.toLowerCase());
    }

    if (!found) { toast('Invalid username or password!', 'error'); return; }

    // FIX: Password session mein store mat karo — security risk
    const { password, ...safeUser } = found;
    const sessionUser = { ...safeUser, role: portal };
    APP.currentUser = { ...found, role: portal }; // memory mein poora (needed for password change)
    sessionStorage.setItem('et_session', JSON.stringify(sessionUser));
    toast(`Welcome, ${found.name}! 👋`);
    launchApp();
  }

  function logout() {
    sessionStorage.removeItem('et_session');
    APP.currentUser = null;
    APP.currentPortal = null;
    document.getElementById('app-shell').style.display = 'none';
    showPortalSelect();
  }

  function checkSession() {
    const s = sessionStorage.getItem('et_session');
    if (s) {
      try {
        APP.currentUser = JSON.parse(s);
        APP.currentPortal = APP.currentUser.role;
        launchApp();
        return true;
      } catch {}
    }
    return false;
  }

  return { showPortalSelect, showLogin, doLogin, logout, checkSession };
})();

// ================================================================
// APP LAUNCHER & NAVIGATION
// ================================================================
function launchApp() {
  document.getElementById('portal-select-screen').style.display = 'none';
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app-shell').style.display = 'block';
  buildSidebar();
  updateTopbar();
  navigateTo(getDefaultPage());
  setTimeout(() => Notifications.init(), 300);
  setTimeout(() => DarkMode.init(), 100);
}

function getDefaultPage() {
  const r = APP.currentPortal;
  if (r === 'admin') return 'dashboard';
  if (r === 'teacher') return 'teacher-dashboard';
  if (r === 'student') return 'student-dashboard';
  return 'dashboard';
}

function buildSidebar() {
  const role = APP.currentPortal;
  const nav = document.getElementById('sidebar-nav');
  const links = getSidebarLinks(role);
  nav.innerHTML = links;
  // Re-attach events
  document.querySelectorAll('.nav-link[data-page]').forEach(l => {
    l.addEventListener('click', () => navigateTo(l.dataset.page));
  });
}

function getSidebarLinks(role) {
  if (role === 'admin') return `
    <div class="nav-section-label">Main</div>
    <ul class="nav flex-column">
      <li class="nav-item"><button class="nav-link" data-page="dashboard"><span class="nav-icon">📊</span><span>Dashboard</span></button></li>
    </ul>
    <div class="nav-section-label mt-2">Academic</div>
    <ul class="nav flex-column">
      <li class="nav-item"><button class="nav-link" data-page="students"><span class="nav-icon">👥</span><span>Students</span></button></li>
      <li class="nav-item"><button class="nav-link" data-page="teachers"><span class="nav-icon">👩‍🏫</span><span>Teachers</span></button></li>
      <li class="nav-item"><button class="nav-link" data-page="classes"><span class="nav-icon">🏫</span><span>Classes</span></button></li>
      <li class="nav-item"><button class="nav-link" data-page="subjects"><span class="nav-icon">📚</span><span>Subjects</span></button></li>
    </ul>
    <div class="nav-section-label mt-2">Management</div>
    <ul class="nav flex-column">
      <li class="nav-item"><button class="nav-link" data-page="attendance"><span class="nav-icon">✅</span><span>Attendance</span></button></li>
      <li class="nav-item"><button class="nav-link" data-page="qr-attendance"><span class="nav-icon">📷</span><span>QR Attendance</span></button></li>
      <li class="nav-item"><button class="nav-link" data-page="results"><span class="nav-icon">📋</span><span>Results</span></button></li>
      <li class="nav-item"><button class="nav-link" data-page="notices"><span class="nav-icon">📢</span><span>Notice Board</span></button></li>
      <li class="nav-item"><button class="nav-link" data-page="timetable"><span class="nav-icon">🗓️</span><span>Timetable</span></button></li>
      <li class="nav-item"><button class="nav-link" data-page="fees"><span class="nav-icon">💰</span><span>Fees</span></button></li>
    </ul>
    <div class="nav-section-label mt-2">Tools</div>
    <ul class="nav flex-column">
      <li class="nav-item"><button class="nav-link" data-page="homework"><span class="nav-icon">📚</span><span>Homework</span></button></li>
      <li class="nav-item"><button class="nav-link" data-page="exam-calendar"><span class="nav-icon">📅</span><span>Exam Calendar</span></button></li>
      <li class="nav-item"><button class="nav-link" data-page="reports"><span class="nav-icon">🖨️</span><span>Reports</span></button></li>
      <li class="nav-item"><button class="nav-link" data-page="progress-report"><span class="nav-icon">📊</span><span>Report Cards</span></button></li>
      <li class="nav-item"><button class="nav-link" data-page="parent-portal"><span class="nav-icon">👨‍👩‍👦</span><span>Parent Portal</span></button></li>
      <li class="nav-item"><button class="nav-link" data-page="ptm"><span class="nav-icon">📢</span><span>PTM Scheduler</span></button></li>
    </ul>
    <div class="nav-section-label mt-2">Finance & HR</div>
    <ul class="nav flex-column">
      <li class="nav-item"><button class="nav-link" data-page="salary"><span class="nav-icon">💰</span><span>Salary</span></button></li>
      <li class="nav-item"><button class="nav-link" data-page="expenses"><span class="nav-icon">💸</span><span>Expenses</span></button></li>
      <li class="nav-item"><button class="nav-link" data-page="staff-attendance"><span class="nav-icon">📋</span><span>Staff Attendance</span></button></li>
      <li class="nav-item"><button class="nav-link" data-page="face-attendance"><span class="nav-icon">👁️</span><span>Face Attendance</span></button></li>
    </ul>
    <div class="nav-section-label mt-2">Library & Misc</div>
    <ul class="nav flex-column">
      <li class="nav-item"><button class="nav-link" data-page="library"><span class="nav-icon">📚</span><span>Library</span></button></li>
      <li class="nav-item"><button class="nav-link" data-page="complaints"><span class="nav-icon">💬</span><span>Complaints</span></button></li>
      <li class="nav-item"><button class="nav-link" data-page="audit-log"><span class="nav-icon">🔒</span><span>Activity Log</span></button></li>
      <li class="nav-item"><button class="nav-link" data-page="notifications"><span class="nav-icon">🔔</span><span>Notifications</span></button></li>
      <li class="nav-item"><button class="nav-link" data-page="whatsapp-notify"><span class="nav-icon">📱</span><span>WhatsApp Notify</span></button></li>
      <li class="nav-item"><button class="nav-link" data-page="admit-card"><span class="nav-icon">🎯</span><span>Admit Cards</span></button></li>
      <li class="nav-item"><button class="nav-link" data-page="merit-list"><span class="nav-icon">🏆</span><span>Merit List</span></button></li>
      <li class="nav-item"><button class="nav-link" data-page="certificates"><span class="nav-icon">📜</span><span>Certificates</span></button></li>
      <li class="nav-item"><button class="nav-link" data-page="promotion"><span class="nav-icon">📅</span><span>Promotion</span></button></li>
      <li class="nav-item"><button class="nav-link" data-page="school-settings"><span class="nav-icon">⚙️</span><span>School Settings</span></button></li>
      <li class="nav-item"><button class="nav-link" data-page="teacher-idcard"><span class="nav-icon">🪪</span><span>Teacher ID Cards</span></button></li>
      <li class="nav-item"><button class="nav-link" data-page="teacher-qr"><span class="nav-icon">📷</span><span>Teacher Att. QR</span></button></li>
      <li class="nav-item"><button class="nav-link" data-page="profile-settings"><span class="nav-icon">👤</span><span>My Profile</span></button></li>
    </ul>`;
  if (role === 'teacher') return `
    <div class="nav-section-label">Teacher</div>
    <ul class="nav flex-column">
      <li class="nav-item"><button class="nav-link" data-page="teacher-dashboard"><span class="nav-icon">📊</span><span>Dashboard</span></button></li>
      <li class="nav-item"><button class="nav-link" data-page="teacher-students"><span class="nav-icon">👥</span><span>My Students</span></button></li>
      <li class="nav-item"><button class="nav-link" data-page="teacher-attendance"><span class="nav-icon">✅</span><span>Attendance</span></button></li>
      <li class="nav-item"><button class="nav-link" data-page="qr-attendance"><span class="nav-icon">📷</span><span>QR Scan</span></button></li>
      <li class="nav-item"><button class="nav-link" data-page="results"><span class="nav-icon">📋</span><span>Marks / Results</span></button></li>
      <li class="nav-item"><button class="nav-link" data-page="notices"><span class="nav-icon">📢</span><span>Notices</span></button></li>
      <li class="nav-item"><button class="nav-link" data-page="homework"><span class="nav-icon">📚</span><span>Homework</span></button></li>
      <li class="nav-item"><button class="nav-link" data-page="exam-calendar"><span class="nav-icon">📅</span><span>Exam Calendar</span></button></li>
      <li class="nav-item"><button class="nav-link" data-page="ptm"><span class="nav-icon">📢</span><span>PTM Meetings</span></button></li>
      <li class="nav-item"><button class="nav-link" data-page="admit-card"><span class="nav-icon">🎯</span><span>Admit Cards</span></button></li>
      <li class="nav-item"><button class="nav-link" data-page="merit-list"><span class="nav-icon">🏆</span><span>Merit List</span></button></li>
      <li class="nav-item"><button class="nav-link" data-page="complaints"><span class="nav-icon">💬</span><span>Complaints</span></button></li>
      <li class="nav-item"><button class="nav-link" data-page="library"><span class="nav-icon">📖</span><span>Library</span></button></li>
      <li class="nav-item"><button class="nav-link" data-page="notifications"><span class="nav-icon">🔔</span><span>Notifications</span></button></li>
      <li class="nav-item"><button class="nav-link" data-page="teacher-my-idcard"><span class="nav-icon">🪪</span><span>My ID Card</span></button></li>
      <li class="nav-item"><button class="nav-link" data-page="profile-settings"><span class="nav-icon">⚙️</span><span>My Profile</span></button></li>
    </ul>`;
  if (role === 'student') return `
    <div class="nav-section-label">My Portal</div>
    <ul class="nav flex-column">
      <li class="nav-item"><button class="nav-link" data-page="student-dashboard"><span class="nav-icon">🏠</span><span>Dashboard</span></button></li>
      <li class="nav-item"><button class="nav-link" data-page="student-profile"><span class="nav-icon">👤</span><span>My Profile</span></button></li>
      <li class="nav-item"><button class="nav-link" data-page="student-idcard"><span class="nav-icon">🪪</span><span>ID Card</span></button></li>
      <li class="nav-item"><button class="nav-link" data-page="student-attendance"><span class="nav-icon">✅</span><span>Attendance</span></button></li>
      <li class="nav-item"><button class="nav-link" data-page="student-results"><span class="nav-icon">📊</span><span>My Results</span></button></li>
      <li class="nav-item"><button class="nav-link" data-page="student-fees"><span class="nav-icon">💰</span><span>Fee Status</span></button></li>
      <li class="nav-item"><button class="nav-link" data-page="notices"><span class="nav-icon">📢</span><span>Notices</span></button></li>
      <li class="nav-item"><button class="nav-link" data-page="homework"><span class="nav-icon">📚</span><span>Homework</span></button></li>
      <li class="nav-item"><button class="nav-link" data-page="exam-calendar"><span class="nav-icon">📅</span><span>Exam Calendar</span></button></li>
      <li class="nav-item"><button class="nav-link" data-page="complaints"><span class="nav-icon">💬</span><span>Feedback</span></button></li>
      <li class="nav-item"><button class="nav-link" data-page="notifications"><span class="nav-icon">🔔</span><span>Notifications</span></button></li>
      <li class="nav-item"><button class="nav-link" data-page="profile-settings"><span class="nav-icon">⚙️</span><span>My Profile</span></button></li>
    </ul>`;
  return '';
}

function updateTopbar() {
  const u = APP.currentUser;
  const role = APP.currentPortal;
  document.getElementById('topbar-user-name').textContent = u?.name || 'User';
  const badge = document.getElementById('topbar-portal-badge');
  badge.className = `portal-badge-top ${role}`;
  badge.textContent = role.charAt(0).toUpperCase() + role.slice(1);
  const av = document.getElementById('topbar-avatar');
  if (u?.photo) {
    av.innerHTML = `<img src="${u.photo}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
  } else {
    av.textContent = Utils.avatar(u?.name);
  }
  document.getElementById('sidebar-user-name').textContent = u?.name || '';
  document.getElementById('sidebar-user-role').textContent = role.charAt(0).toUpperCase() + role.slice(1);
  const sav = document.getElementById('sidebar-avatar');
  if (u?.photo) sav.innerHTML = `<img src="${u.photo}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
  else sav.textContent = Utils.avatar(u?.name);
}

// ---- NAVIGATE ----
const PAGE_TITLES = {
  dashboard:'Dashboard', students:'Students', teachers:'Teachers',
  classes:'Classes', subjects:'Subjects', attendance:'Attendance',
  'qr-attendance':'QR Attendance', results:'Results & Marks',
  notices:'Notice Board', timetable:'Timetable', fees:'Fee Management',
  'teacher-dashboard':'Teacher Dashboard','teacher-students':'My Students',
  'teacher-attendance':'Mark Attendance',
  'student-dashboard':'My Dashboard','student-profile':'My Profile',
  'student-idcard':'My ID Card','student-attendance':'My Attendance',
  'student-results':'My Results','student-fees':'Fee Status',
  'homework':'Homework & Assignments','exam-calendar':'Exam Calendar',
  'reports':'Reports & Print','parent-portal':'Parent Portal',
  'notifications':'Notifications','profile-settings':'My Profile & Settings',
  'progress-report':'Progress Report Cards',
  'salary':'Salary Management',
  'library':'Library Management',
  'ptm':'Parent-Teacher Meetings',
  'complaints':'Complaints & Feedback',
  'audit-log':'Activity Log',
  'staff-attendance':'Staff Attendance & Leave',
  'expenses':'Expense Tracker',
  'face-attendance':'👁️ Face Recognition Attendance',
  'whatsapp-notify':'📱 WhatsApp Notifications',
  'admit-card':'🎯 Exam Admit Cards',
  'merit-list':'🏆 Student Rank / Merit List',
  'certificates':'📜 Certificate Generator',
  'promotion':'📅 Student Promotion',
  'school-settings':'⚙️ School Settings',
  'teacher-idcard':'🪪 Teacher ID Cards',
  'teacher-my-idcard':'🪪 My ID Card',
  'teacher-qr':'📷 Teacher QR Attendance',
};

// Pages that ONLY admin/teacher can access
const ADMIN_TEACHER_PAGES = [
  'qr-attendance','attendance','teacher-attendance',
  'students','teachers','classes','subjects',
  'results','timetable','fees',
  'dashboard','teacher-dashboard',
  'teacher-students','reports',
];

function navigateTo(pageId) {
  // ── Role restriction ───────────────────────────────────────────
  const role = APP.currentPortal;
  if (role === 'student' && ADMIN_TEACHER_PAGES.includes(pageId)) {
    toast('Yeh page sirf Admin / Teacher ke liye hai.', 'error');
    return;
  }
  // Prevent teacher from accessing admin-only pages
  const ADMIN_ONLY_PAGES = ['students','teachers','classes','subjects','timetable','fees','dashboard',
    'salary','staff-attendance','expenses','audit-log','face-attendance'];
  if (role === 'teacher' && ADMIN_ONLY_PAGES.includes(pageId)) {
    toast('Yeh page sirf Admin ke liye hai.', 'error');
    return;
  }

  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-link[data-page]').forEach(l => l.classList.remove('active'));
  // Cleanup face camera if navigating away
  if (typeof FaceAttendance !== 'undefined' && pageId !== 'face-attendance') {
    try { FaceAttendance.cleanup(); } catch(e) {}
  }
  if (typeof TeacherQRAttendance !== 'undefined' && pageId !== 'teacher-qr') {
    try { TeacherQRAttendance.cleanup(); } catch(e) {}
  }
  const page = document.getElementById('page-'+pageId);
  if (page) page.classList.add('active');
  const link = document.querySelector(`.nav-link[data-page="${pageId}"]`);
  if (link) link.classList.add('active');
  document.getElementById('topbar-page-title').textContent = PAGE_TITLES[pageId] || pageId;
  // Close mobile sidebar
  document.getElementById('sidebar').classList.remove('mobile-open');
  document.getElementById('sidebar-overlay').classList.remove('show');
  // Render the page
  const renders = {
    dashboard: () => Dashboard.render(),
    students: () => Students.render(),
    teachers: () => Teachers.render(),
    classes: () => Classes.render(),
    subjects: () => Subjects.render(),
    attendance: () => Attendance.render(),
    'qr-attendance': () => QRAttendance.render(),
    results: () => Results.render(),
    notices: () => Notices.render(),
    timetable: () => Timetable.render(),
    fees: () => Fees.render(),
    'teacher-dashboard': () => TeacherPortal.renderDashboard(),
    'teacher-students': () => TeacherPortal.renderStudents(),
    'teacher-attendance': () => Attendance.render(),
    'student-dashboard': () => StudentPortal.renderDashboard(),
    'student-profile': () => StudentPortal.renderProfile(),
    'student-idcard': () => StudentPortal.renderIDCard(),
    'student-attendance': () => StudentPortal.renderAttendance(),
    'student-results': () => { StudentPortal.renderResults(); StudentResultPopup.renderInStudentPortal(); },
    'student-fees': () => StudentPortal.renderFees(),
    'homework': () => Homework.render(),
    'exam-calendar': () => ExamCalendar.render(),
    'reports': () => Reports.render(),
    'parent-portal': () => ParentPortal.init(),
    'notifications': () => Notifications.render(),
    'profile-settings': () => PasswordChange.render(),
    'progress-report': () => ProgressReport.render(),
    'salary': () => Salary.render(),
    'library': () => Library.render(),
    'ptm': () => PTM.render(),
    'complaints': () => Complaints.render(),
    'audit-log': () => AuditLog.render(),
    'staff-attendance': () => StaffAttendance.render(),
    'expenses': () => Expenses.render(),
    'face-attendance': () => FaceAttendance.render(),
    'whatsapp-notify': () => WhatsAppNotify.render(),
    'admit-card': () => AdmitCard.render(),
    'merit-list': () => MeritList.render(),
    'certificates': () => Certificates.render(),
    'promotion': () => Promotion.render(),
    'school-settings': () => SchoolSettings.render(),
    'teacher-idcard': () => TeacherIDCard.render(),
    'teacher-my-idcard': () => TeacherIDCard.renderMyCard(),
    'teacher-qr': () => TeacherQRAttendance.render(),
  };
  if (renders[pageId]) setTimeout(() => renders[pageId](), 10);
}

// ---- SIDEBAR TOGGLE ----
function initSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  document.getElementById('toggle-sidebar').addEventListener('click', () => {
    if (window.innerWidth <= 768) {
      sidebar.classList.toggle('mobile-open');
      overlay.classList.toggle('show');
    } else {
      sidebar.classList.toggle('collapsed');
      document.body.classList.toggle('sidebar-collapsed');
    }
  });
  overlay.addEventListener('click', () => {
    sidebar.classList.remove('mobile-open');
    overlay.classList.remove('show');
  });
}
