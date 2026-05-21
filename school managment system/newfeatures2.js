// ================================================================
// NEWFEATURES2.JS — HBHS v3.2
// 1. WhatsApp Notifications (Auto: 2+ months unpaid)
// 2. Exam Admit Card (Blocked if 2+ months unpaid)
// 3. Student Rank / Merit List (Roll number popup)
// ================================================================

// ---- HELPER: 2+ months unpaid check ----
function checkFeeDefaulter(sid) {
  const fees = DB.get('fees');
  const cur = new Date().toISOString().slice(0,7);
  const up = fees.filter(f => f.studentId===sid && f.status==='pending' && f.month<cur);
  return { blocked: up.length>=2, count: up.length, months: up.map(f=>f.month).sort() };
}
function _fml(m) {
  if(!m) return '';
  const [y,mo] = m.split('-');
  const n = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return n[parseInt(mo)]+' '+y;
}

// ================================================================
// 1. WhatsApp NOTIFICATIONS
// ================================================================
const WhatsAppNotify = (() => {
  function getDefaulters() {
    return DB.get('students').map(s => {
      const c = checkFeeDefaulter(s.id);
      return {...s,...c};
    }).filter(s=>s.blocked);
  }
  function buildMsg(s, fi) {
    const fees = DB.get('fees');
    const cur = new Date().toISOString().slice(0,7);
    const due = fees.filter(f=>f.studentId===s.id&&f.status==='pending'&&f.month<cur).reduce((t,f)=>t+(f.amount||0),0);
    const mNames = fi.months.map(m=>_fml(m)).join(', ');
    return `🏫 *Hira Baitul Hamd School, Sukkur*\n\nAssalam o Alaikum!\n\n*${s.father||'Walid Sahib'}* sahib,\n\nAapke bache/bachi *${s.name}* (Roll: ${s.roll}, Class: ${s.cls} ${s.section||''}) ki *${fi.count} mahine* ki fees pending hai:\n\n📅 Mahine: ${mNames}\n💰 Kul Baqaya: *PKR ${due.toLocaleString()}*\n\n⚠️ Meherbani farma kar jald fees ada karein. Fees pending hone ki wajah se Admit Card bhi nahi banega.\n\nShukriya\n— HBHS Administration`;
  }
  function openWA(phone, msg, s) {
    const p = (phone||'').replace(/[^0-9]/g,'');
    const ip = p.startsWith('0')?'92'+p.slice(1):p.startsWith('92')?p:'92'+p;
    const logs = DB.get('waLogs',[]);
    logs.push({time:Date.now(),studentName:s.name,phone,type:'Fee Warning'});
    DB.set('waLogs',logs);
    DB.set('waSentCount',(DB.get('waSentCount',0))+1);
    window.open(`https://wa.me/${ip}?text=${encodeURIComponent(msg)}`,'_blank');
  }
  function render() {
    const c = document.getElementById('whatsapp-container');
    if(!c) return;
    const students = DB.get('students');
    const fees = DB.get('fees');
    const cur = new Date().toISOString().slice(0,7);
    const defaulters = getDefaulters();
    const pending = fees.filter(f=>f.status==='pending'&&f.month<cur).length;
    c.innerHTML = `
      <!-- FIX: Clear notice about wa.me links -->
      <div style="background:#fef9c3;border:1px solid #d97706;border-radius:8px;padding:12px 16px;margin-bottom:16px;display:flex;align-items:center;gap:10px">
        <span style="font-size:20px">ℹ️</span>
        <div style="font-size:13px;color:#92400e"><strong>Note:</strong> Yeh feature WhatsApp Web (wa.me) links use karta hai. Har message ke liye WhatsApp manually open hoga — yeh automated bulk SMS nahi hai. Real WhatsApp Business API ke liye alag subscription chahiye.</div>
      </div>
      <div class="row g-3 mb-4">
        <div class="col-md-3"><div class="card text-center" style="background:linear-gradient(135deg,#25D366,#128C7E);color:#fff"><div class="card-body py-3"><div style="font-size:2rem">👥</div><div style="font-size:1.8rem;font-weight:700">${students.length}</div><div style="font-size:12px;opacity:.85">Total Students</div></div></div></div>
        <div class="col-md-3"><div class="card text-center" style="background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff"><div class="card-body py-3"><div style="font-size:2rem">⚠️</div><div style="font-size:1.8rem;font-weight:700">${defaulters.length}</div><div style="font-size:12px;opacity:.85">2+ Months Defaulters</div></div></div></div>
        <div class="col-md-3"><div class="card text-center" style="background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff"><div class="card-body py-3"><div style="font-size:2rem">💰</div><div style="font-size:1.8rem;font-weight:700">${pending}</div><div style="font-size:12px;opacity:.85">Pending Records</div></div></div></div>
        <div class="col-md-3"><div class="card text-center" style="background:linear-gradient(135deg,#6366f1,#4f46e5);color:#fff"><div class="card-body py-3"><div style="font-size:2rem">✉️</div><div style="font-size:1.8rem;font-weight:700">${DB.get('waSentCount',0)}</div><div style="font-size:12px;opacity:.85">Messages Sent</div></div></div></div>
      </div>
      <div class="card mb-4" style="border:2px solid #ef4444">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-center mb-3">
            <div><h6 class="fw-bold mb-0" style="color:#ef4444">🚨 2+ Mahine Fees Unpaid — Auto Alert</h6><small class="text-muted">In students ko fee warning message bhejein</small></div>
            ${defaulters.length>0?`<button class="btn btn-danger fw-bold" onclick="WhatsAppNotify.sendAllDefaulters()">📱 Send All (${defaulters.length})</button>`:''}
          </div>
          ${defaulters.length===0?`<div class="text-center py-4"><div style="font-size:3rem">✅</div><h5 class="mt-2 text-success">Koi Defaulter Nahi!</h5><p class="text-muted">Tamam students ki fees theek hain.</p></div>`:`
          <div class="table-container"><table class="table table-hover">
            <thead><tr style="background:#fef2f2"><th>#</th><th>Student</th><th>Father</th><th>Phone</th><th>Class</th><th>Pending Months</th><th>Action</th></tr></thead>
            <tbody>${defaulters.map((s,i)=>`<tr>
              <td>${i+1}</td>
              <td><div class="d-flex align-items-center gap-2">${s.photo?`<img src="${s.photo}" style="width:32px;height:32px;border-radius:50%;object-fit:cover">`:`<div style="width:32px;height:32px;background:linear-gradient(135deg,#ef4444,#dc2626);border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700">${(s.name||'?')[0]}</div>`}<div><div style="font-weight:600">${s.name}</div><div style="font-size:11px;color:#ef4444">⚠️ ${s.count} mahine baqaya</div></div></div></td>
              <td>${s.father||'—'}</td>
              <td>${s.phone?`<span style="color:#25D366;font-weight:600">${s.phone}</span>`:'<span class="text-muted">Nahi hai</span>'}</td>
              <td>${s.cls} ${s.section||''}</td>
              <td>${s.months.map(m=>`<span class="badge bg-danger me-1">${_fml(m)}</span>`).join('')}</td>
              <td>${s.phone?`<button class="btn btn-sm btn-success fw-bold" onclick="WhatsAppNotify.sendOne('${s.id}')" style="background:#25D366;border-color:#25D366">📱 Send</button>`:'<span class="text-muted small">Phone nahi</span>'}</td>
            </tr>`).join('')}</tbody>
          </table></div>`}
        </div>
      </div>
      <div class="card mb-4">
        <div class="card-body">
          <h6 class="fw-bold mb-3">✏️ Custom Message Bhejein</h6>
          <div class="row g-3">
            <div class="col-md-4"><label class="form-label">Student</label><select id="wa-cs" class="form-select"><option value="">-- Student Choose Karein --</option>${students.map(s=>`<option value="${s.id}">${s.name} (${s.cls}${s.section?' '+s.section:''})</option>`).join('')}</select></div>
            <div class="col-md-8"><label class="form-label">Message</label><textarea id="wa-cm" class="form-control" rows="3" placeholder="Custom message likhein..."></textarea></div>
          </div>
          <button class="btn btn-success mt-3" onclick="WhatsAppNotify.sendCustom()" style="background:#25D366;border-color:#25D366">📱 WhatsApp pe Send Karein</button>
        </div>
      </div>
      <div class="card">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-center mb-3"><h6 class="fw-bold mb-0">📋 Message Log</h6><button class="btn btn-sm btn-outline-danger" onclick="WhatsAppNotify.clearLog()">🗑️ Clear</button></div>
          ${renderLog()}
        </div>
      </div>`;
  }
  function renderLog() {
    const logs = DB.get('waLogs',[]);
    if(!logs.length) return '<p class="text-muted text-center py-3">Koi message nahi bheja abhi tak.</p>';
    return `<div class="table-container" style="max-height:220px;overflow-y:auto"><table class="table table-sm"><thead><tr><th>Time</th><th>Student</th><th>Phone</th><th>Type</th></tr></thead><tbody>${logs.slice().reverse().slice(0,50).map(l=>`<tr><td style="font-size:11px">${new Date(l.time).toLocaleString('en-PK')}</td><td>${l.studentName}</td><td style="color:#25D366">${l.phone}</td><td><span class="badge bg-success">${l.type||'Custom'}</span></td></tr>`).join('')}</tbody></table></div>`;
  }
  function sendOne(sid) {
    const s = DB.get('students').find(x=>x.id===sid);
    if(!s||!s.phone){toast('Phone number nahi hai!','error');return;}
    const fi = checkFeeDefaulter(sid);
    openWA(s.phone, buildMsg(s,fi), s);
    toast(`${s.name} ko fee warning bheja gaya! ✅`,'success');
  }
  function sendAllDefaulters() {
    const d = getDefaulters().filter(s=>s.phone);
    if(!d.length){toast('Koi defaulter nahi jiske paas phone ho!','error');return;}
    d.forEach((s,i)=>setTimeout(()=>{openWA(s.phone,buildMsg(s,{count:s.count,months:s.months}),s);},(i)*1200));
    toast(`${d.length} defaulters ko messages bheje ja rahe hain...`,'info');
  }
  function sendCustom() {
    const sid = document.getElementById('wa-cs')?.value;
    const msg = document.getElementById('wa-cm')?.value?.trim();
    if(!sid){toast('Student select karein!','error');return;}
    if(!msg){toast('Message likhein!','error');return;}
    const s = DB.get('students').find(x=>x.id===sid);
    if(!s?.phone){toast('Is student ka phone nahi hai!','error');return;}
    const p=(s.phone||'').replace(/[^0-9]/g,'');
    const ip=p.startsWith('0')?'92'+p.slice(1):p.startsWith('92')?p:'92'+p;
    const logs=DB.get('waLogs',[]);
    logs.push({time:Date.now(),studentName:s.name,phone:s.phone,type:'Custom'});
    DB.set('waLogs',logs);
    window.open(`https://wa.me/${ip}?text=${encodeURIComponent(msg)}`,'_blank');
    toast(`${s.name} ko message bheja gaya! ✅`,'success');
  }
  function clearLog() {
    confirmDialog('Tamam message log delete kar dein?',()=>{DB.set('waLogs',[]);DB.set('waSentCount',0);render();toast('Log clear!','success');});
  }
  return {render,sendOne,sendAllDefaulters,sendCustom,clearLog};
})();

// ================================================================
// 2. EXAM ADMIT CARD
// ================================================================
const AdmitCard = (() => {
  function render() {
    const c = document.getElementById('admit-card-container');
    if(!c) return;
    const classes = DB.get('classes').map(x=>x.name);
    const students = DB.get('students');
    const defIds = new Set(students.filter(s=>checkFeeDefaulter(s.id).blocked).map(s=>s.id));
    c.innerHTML = `
      <div class="card mb-3" style="border:2px solid #ef4444;background:#fef2f2"><div class="card-body py-2 px-3"><small style="color:#ef4444;font-weight:600">⚠️ Note: Jis student ki 2 ya zyada mahine ki fees pending ho, uska Admit Card nahi banega. (${defIds.size} students blocked)</small></div></div>
      <div class="card mb-3"><div class="card-body">
        <h6 class="fw-bold mb-3">⚙️ Settings</h6>
        <div class="row g-3">
          <div class="col-md-3"><label class="form-label">Exam Name</label><input type="text" id="ac-exam-name" class="form-control" value="Annual Examinations 2025"></div>
          <div class="col-md-2"><label class="form-label">Date From</label><input type="date" id="ac-exam-from" class="form-control"></div>
          <div class="col-md-2"><label class="form-label">Date To</label><input type="date" id="ac-exam-to" class="form-control"></div>
          <div class="col-md-2"><label class="form-label">Class</label><select id="ac-class-filter" class="form-select" onchange="AdmitCard.filterStudents()"><option value="">All Classes</option>${classes.map(x=>`<option>${x}</option>`).join('')}</select></div>
          <div class="col-md-3 d-flex align-items-end gap-2"><button class="btn btn-primary" onclick="AdmitCard.filterStudents()">🔄 Load</button><button class="btn btn-success" onclick="AdmitCard.printAll()">🖨️ Print All Eligible</button></div>
        </div>
      </div></div>
      <div id="ac-student-list" class="row g-3">${renderCards(students,defIds)}</div>`;
  }
  function renderCards(students, defIds) {
    if(!students.length) return '<div class="col-12"><p class="text-muted text-center py-4">Koi student nahi.</p></div>';
    return students.map(s=>{
      const blocked = defIds ? defIds.has(s.id) : checkFeeDefaulter(s.id).blocked;
      const fi = blocked ? checkFeeDefaulter(s.id) : null;
      return `<div class="col-md-6 col-lg-4"><div class="card" style="border:2px solid ${blocked?'#ef4444':'#d1fae5'}">
        <div class="card-body p-3">
          <div class="d-flex align-items-center gap-2 mb-2">
            ${s.photo?`<img src="${s.photo}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;${blocked?'filter:grayscale(80%)':''}">`:`<div style="width:40px;height:40px;background:linear-gradient(135deg,${blocked?'#ef4444,#dc2626':'#6366f1,#8b5cf6'});border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:16px">${(s.name||'?')[0]}</div>`}
            <div style="flex:1"><div style="font-weight:600;font-size:14px">${s.name}</div><div style="font-size:11px;color:#6b7280">${s.roll} • ${s.cls} ${s.section||''}</div></div>
            ${blocked?'<span style="font-size:1.2rem">🔒</span>':'<span style="font-size:1.2rem">✅</span>'}
          </div>
          ${blocked?`<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:6px 10px;margin-bottom:8px;font-size:12px;color:#ef4444"><strong>⛔ Blocked:</strong> ${fi.count} mahine fees pending<br><span style="color:#6b7280">${fi.months.map(m=>_fml(m)).join(', ')}</span></div><button class="btn btn-sm btn-outline-secondary w-100" disabled>🚫 Admit Card Blocked</button>`:`<button class="btn btn-sm btn-outline-primary w-100" onclick="AdmitCard.printOne('${s.id}')">🖨️ Print Admit Card</button>`}
        </div>
      </div></div>`;
    }).join('');
  }
  function filterStudents() {
    const cls = document.getElementById('ac-class-filter')?.value;
    let students = DB.get('students');
    if(cls) students=students.filter(s=>s.cls===cls);
    const defIds = new Set(DB.get('students').filter(s=>checkFeeDefaulter(s.id).blocked).map(s=>s.id));
    document.getElementById('ac-student-list').innerHTML = renderCards(students,defIds);
  }
  function buildCard(s, examName, df, dt) {
    const exams = DB.get('examSchedule',[]);
    const subjects = DB.get('subjects');
    const rows = exams.length>0
      ? exams.filter(e=>!e.cls||e.cls===s.cls).slice(0,8).map(e=>`<tr><td style="padding:5px 8px;border:1px solid #d1d5db;font-size:12px">${e.title||e.subject||''}</td><td style="padding:5px 8px;border:1px solid #d1d5db;font-size:12px">${e.date||'—'}</td><td style="padding:5px 8px;border:1px solid #d1d5db;font-size:12px">${e.time||'8:00 AM'}</td></tr>`).join('')
      : subjects.slice(0,6).map(x=>`<tr><td style="padding:5px 8px;border:1px solid #d1d5db;font-size:12px">${x.name}</td><td style="padding:5px 8px;border:1px solid #d1d5db;font-size:12px">—</td><td style="padding:5px 8px;border:1px solid #d1d5db;font-size:12px">8:00 AM</td></tr>`).join('');
    return `<div style="width:700px;margin:0 auto 40px;border:3px solid #1e3a8a;font-family:Arial,sans-serif;page-break-after:always">
      <div style="background:linear-gradient(135deg,#1e3a8a,#2563eb);color:#fff;padding:18px 24px;text-align:center">
        <div style="font-size:22px;font-weight:700">🎓 Hira Baitul Hamd School</div>
        <div style="font-size:12px;opacity:.8;margin-top:2px">Sukkur, Sindh — Pakistan</div>
        <div style="margin-top:8px;background:rgba(255,255,255,.18);display:inline-block;padding:4px 22px;border-radius:20px;font-size:14px;font-weight:600">${examName||'Examinations 2025'}</div>
      </div>
      <div style="background:#fef3c7;text-align:center;padding:6px;border-bottom:2px solid #f59e0b">
        <span style="font-size:16px;font-weight:700;color:#92400e;letter-spacing:2px">ADMIT CARD / داخلہ کارڈ</span>
      </div>
      <div style="display:flex;padding:16px 22px;gap:16px;border-bottom:1px solid #e5e7eb;background:#f9fafb">
        <div style="flex:1">
          <table style="width:100%;border-collapse:collapse">
            ${[['Student Name',s.name],["Father's Name",s.father||'—'],['Roll Number',s.roll],['Class / Section',s.cls+' '+(s.section||'')],['Exam Period',(df||'—')+' to '+(dt||'—')]].map(([l,v])=>`<tr><td style="padding:4px 0;font-size:12px;color:#6b7280;width:130px">${l}:</td><td style="padding:4px 0;font-size:13px;font-weight:700;border-bottom:1px solid #e5e7eb">${v}</td></tr>`).join('')}
          </table>
        </div>
        <div style="text-align:center;flex-shrink:0">
          ${s.photo?`<img src="${s.photo}" style="width:90px;height:110px;object-fit:cover;border:2px solid #1e3a8a;border-radius:4px">`:`<div style="width:90px;height:110px;border:2px dashed #9ca3af;display:flex;align-items:center;justify-content:center;font-size:11px;color:#9ca3af;border-radius:4px;text-align:center">📷<br>Photo</div>`}
          <div style="font-size:10px;color:#9ca3af;margin-top:4px">Photograph</div>
        </div>
      </div>
      <div style="padding:12px 22px">
        <div style="font-size:13px;font-weight:700;color:#1e3a8a;margin-bottom:6px">📅 Exam Schedule</div>
        <table style="width:100%;border-collapse:collapse">
          <thead><tr style="background:#1e3a8a;color:#fff"><th style="padding:6px 8px;border:1px solid #1e3a8a;font-size:12px;text-align:left">Subject</th><th style="padding:6px 8px;border:1px solid #1e3a8a;font-size:12px;text-align:left">Date</th><th style="padding:6px 8px;border:1px solid #1e3a8a;font-size:12px;text-align:left">Time</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <div style="background:#f0fdf4;padding:8px 22px;border-top:1px solid #d1fae5">
        <div style="font-size:11px;font-weight:700;color:#374151;margin-bottom:3px">⚠️ Important Instructions / اہم ہدایات:</div>
        <div style="font-size:11px;color:#6b7280;line-height:1.7">1. Yeh card exam hall mein laana zaroori hai. | This card is mandatory.<br>2. Exam se 15 minute pehle aa jayein. | Arrive 15 minutes before exam.<br>3. Mobile phone exam hall mein mana hai. | No mobile phones allowed.</div>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 22px;border-top:1px solid #e5e7eb;background:#f9fafb">
        <div style="text-align:center"><div style="border-top:1px solid #374151;width:120px"></div><div style="font-size:11px;color:#6b7280;margin-top:4px">Principal Signature</div></div>
        <div style="text-align:center;font-size:10px;color:#9ca3af">Issued: ${new Date().toLocaleDateString('en-PK')}<br>HBHS Official Document</div>
        <div style="text-align:center"><div style="border-top:1px solid #374151;width:120px"></div><div style="font-size:11px;color:#6b7280;margin-top:4px">Student Signature</div></div>
      </div>
    </div>`;
  }
  function printOne(sid) {
    const s = DB.get('students').find(x=>x.id===sid);
    if(!s) return;
    if(checkFeeDefaulter(sid).blocked) {
      const fi = checkFeeDefaulter(sid);
      toast(`⛔ ${s.name} ka Admit Card blocked hai — ${fi.count} mahine fees pending (${fi.months.map(m=>_fml(m)).join(', ')})!`,'error');
      return;
    }
    const en=document.getElementById('ac-exam-name')?.value, df=document.getElementById('ac-exam-from')?.value, dt=document.getElementById('ac-exam-to')?.value;
    const w=window.open('','_blank');
    w.document.write(`<html><head><title>Admit Card</title><style>body{margin:0;padding:20px;background:#f3f4f6}@media print{body{background:#fff;padding:0}}</style></head><body>${buildCard(s,en,df,dt)}<script>window.onload=()=>window.print()<\/script></body></html>`);
    w.document.close();
  }
  function printAll() {
    const cls=document.getElementById('ac-class-filter')?.value;
    const en=document.getElementById('ac-exam-name')?.value, df=document.getElementById('ac-exam-from')?.value, dt=document.getElementById('ac-exam-to')?.value;
    let students=DB.get('students');
    if(cls) students=students.filter(s=>s.cls===cls);
    const eligible=students.filter(s=>!checkFeeDefaulter(s.id).blocked);
    const blocked=students.length-eligible.length;
    if(!eligible.length){toast('Koi eligible student nahi — sab ke fees pending hain!','error');return;}
    const cards=eligible.map(s=>buildCard(s,en,df,dt)).join('');
    const w=window.open('','_blank');
    w.document.write(`<html><head><title>Admit Cards</title><style>body{margin:0;padding:20px;background:#f3f4f6}@media print{body{background:#fff;padding:0}}</style></head><body>${cards}<script>window.onload=()=>window.print()<\/script></body></html>`);
    w.document.close();
    toast(`${eligible.length} admit cards print ho rahe hain${blocked>0?` (${blocked} fees ki wajah se skip)`:''}.`,'success');
  }
  return {render,filterStudents,printOne,printAll};
})();

// ================================================================
// 3. STUDENT RANK / MERIT LIST
// ================================================================
const MeritList = (() => {
  function calcStats(students, results, exam) {
    let rs = results;
    if(exam) rs = results.filter(r=>r.exam===exam);
    return students.map(s=>{
      let tot=0, mx=0, sc=0;
      rs.forEach(r=>{
        const my = r.results?.find(x=>x.studentId===s.id);
        if(!my) return;
        const subs = r.subjects||[];
        if(my.marks && !Array.isArray(my.marks) && typeof my.marks==='object') {
          subs.forEach(sub=>{ const m=parseInt(my.marks[sub.id])||0, x=parseInt(sub.total||sub.maxMarks||100); tot+=m; mx+=x; sc++; });
        } else {
          (my.marks||[]).forEach(m=>{ tot+=parseInt(m.obtained||m.marks||0); mx+=parseInt(m.total||m.maxMarks||100); sc++; });
        }
      });
      const pct=mx>0?Math.round((tot/mx)*100):0;
      return {...s, totalObtained:tot, totalMax:mx, pct, grade:Utils.getGrade(pct), subjectCount:sc};
    }).filter(s=>s.subjectCount>0);
  }
  function render() {
    const c = document.getElementById('merit-list-container');
    if(!c) return;
    const classes = DB.get('classes').map(x=>x.name);
    const results = DB.get('results',[]);
    const exams = [...new Set(results.map(r=>r.exam).filter(Boolean))];
    c.innerHTML = `
      <div class="card mb-4" style="border:2px solid #6366f1;background:linear-gradient(135deg,#eef2ff,#e0e7ff)">
        <div class="card-body">
          <h6 class="fw-bold mb-1" style="color:#4338ca">🔍 Roll Number se Result Dekhein</h6>
          <p class="text-muted mb-3" style="font-size:13px">Student apna roll number daley aur apna result popup mein dekhe</p>
          <div class="d-flex gap-2 align-items-center flex-wrap">
            <input type="text" id="ml-roll-input" class="form-control" style="max-width:200px" placeholder="Roll Number likhein..." onkeydown="if(event.key==='Enter')MeritList.showPopup()">
            <select id="ml-roll-exam" class="form-select" style="max-width:220px"><option value="">All Exams</option>${exams.map(e=>`<option>${e}</option>`).join('')}</select>
            <button class="btn btn-primary fw-bold px-4" onclick="MeritList.showPopup()" style="background:linear-gradient(135deg,#6366f1,#4f46e5);border:none">🏆 Result Dekho</button>
          </div>
        </div>
      </div>
      <div class="card mb-3"><div class="card-body">
        <div class="row g-3 align-items-end">
          <div class="col-md-3"><label class="form-label fw-semibold">Class</label><select id="ml-class" class="form-select" onchange="MeritList.gen()"><option value="">All Classes</option>${classes.map(x=>`<option>${x}</option>`).join('')}</select></div>
          <div class="col-md-3"><label class="form-label fw-semibold">Exam</label><select id="ml-exam" class="form-select" onchange="MeritList.gen()"><option value="">All Exams</option>${exams.map(e=>`<option>${e}</option>`).join('')}</select></div>
          <div class="col-md-3 d-flex gap-2 align-items-end"><button class="btn btn-primary" onclick="MeritList.gen()">📊 Generate</button><button class="btn btn-outline-success" onclick="MeritList.print()">🖨️ Print</button></div>
        </div>
      </div></div>
      <div id="ml-area"></div>
      <div id="ml-overlay" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:9999;overflow-y:auto;align-items:flex-start;justify-content:center;padding:30px 0">
        <div id="ml-box" style="background:#fff;border-radius:20px;max-width:500px;width:94%;margin:0 auto;overflow:hidden;box-shadow:0 25px 60px rgba(0,0,0,.4)"></div>
      </div>`;
    gen();
  }
  function showPopup() {
    const roll=(document.getElementById('ml-roll-input')?.value||'').trim();
    const exam=document.getElementById('ml-roll-exam')?.value||'';
    if(!roll){toast('Roll number likhein!','error');return;}
    const students=DB.get('students');
    const s=students.find(x=>x.roll&&x.roll.toLowerCase()===roll.toLowerCase());
    if(!s){toast(`Roll No "${roll}" kisi student ka nahi mila!`,'error');return;}
    const results=DB.get('results',[]);
    const classMates=students.filter(x=>x.cls===s.cls);
    const ranked=calcStats(classMates,results,exam).sort((a,b)=>b.pct-a.pct);
    const my=ranked.find(x=>x.id===s.id);
    if(!my||my.subjectCount===0){toast(`${s.name} ka koi result nahi mila!`,'error');return;}
    const rank=ranked.findIndex(x=>x.id===s.id)+1;
    drawPopup(s,my,rank,ranked.length,exam,results);
  }
  function gradeColor(p){return p>=80?'#059669':p>=60?'#2563eb':p>=50?'#d97706':'#dc2626';}
  function drawPopup(s, stats, rank, total, exam, allResults) {
    const ov=document.getElementById('ml-overlay');
    const box=document.getElementById('ml-box');
    if(!ov||!box) return;
    const medals={1:{icon:'🥇',label:'1st Position',grad:'linear-gradient(135deg,#fef9c3,#fde68a)',color:'#b45309'},
                  2:{icon:'🥈',label:'2nd Position',grad:'linear-gradient(135deg,#f1f5f9,#e2e8f0)',color:'#4b5563'},
                  3:{icon:'🥉',label:'3rd Position',grad:'linear-gradient(135deg,#fdf3e9,#fde9d0)',color:'#92400e'}};
    const m=medals[rank];
    const gc=gradeColor(stats.pct);
    const rl=rank===1?'1st':rank===2?'2nd':rank===3?'3rd':rank+'th';
    // subject rows
    let subRows='';
    const rs=exam?allResults.filter(r=>r.exam===exam):allResults;
    rs.forEach(r=>{
      const my=r.results?.find(x=>x.studentId===s.id);
      if(!my) return;
      const subs=r.subjects||[];
      if(my.marks&&!Array.isArray(my.marks)&&typeof my.marks==='object'){
        subs.forEach(sub=>{
          const mo=parseInt(my.marks[sub.id])||0, mx=parseInt(sub.total||sub.maxMarks||100), sp=Math.round((mo/mx)*100);
          const gc2=gradeColor(sp);
          subRows+=`<tr><td style="padding:6px 10px;font-size:13px;border-bottom:1px solid #f3f4f6">${sub.name}</td><td style="padding:6px 10px;text-align:center;font-weight:700;color:${mo/mx>=0.5?'#059669':'#ef4444'};border-bottom:1px solid #f3f4f6">${mo}</td><td style="padding:6px 10px;text-align:center;color:#6b7280;border-bottom:1px solid #f3f4f6">${mx}</td><td style="padding:6px 10px;text-align:center;border-bottom:1px solid #f3f4f6"><span style="background:${sp>=80?'#d1fae5':sp>=60?'#dbeafe':sp>=50?'#fef3c7':'#fee2e2'};color:${sp>=80?'#065f46':sp>=60?'#1e40af':sp>=50?'#92400e':'#991b1b'};padding:2px 8px;border-radius:10px;font-size:12px;font-weight:700">${Utils.getGrade(sp)}</span></td></tr>`;
        });
      }
    });
    box.innerHTML=`
      <div style="background:linear-gradient(135deg,#1e3a8a,#3b82f6,#6366f1);padding:22px;text-align:center;color:#fff">
        <div style="font-size:11px;opacity:.7;letter-spacing:2px;text-transform:uppercase">Hira Baitul Hamd School</div>
        <div style="font-size:13px;opacity:.85;margin-top:4px">${exam||'Result Card'}</div>
      </div>
      <div style="padding:20px;text-align:center;border-bottom:1px solid #e5e7eb">
        ${s.photo?`<img src="${s.photo}" style="width:80px;height:80px;border-radius:50%;object-fit:cover;border:4px solid #6366f1;box-shadow:0 4px 15px rgba(99,102,241,.3);margin-bottom:10px">`:`<div style="width:80px;height:80px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-size:2rem;font-weight:700;margin:0 auto 10px;box-shadow:0 4px 15px rgba(99,102,241,.3)">${(s.name||'?')[0]}</div>`}
        <div style="font-size:20px;font-weight:700;color:#111">${s.name}</div>
        <div style="font-size:13px;color:#6b7280;margin-top:3px">${s.cls} ${s.section||''} • Roll: <strong>${s.roll}</strong></div>
        ${s.father?`<div style="font-size:12px;color:#9ca3af">Father: ${s.father}</div>`:''}
      </div>
      <div style="padding:20px;background:${m?m.grad:'#f9fafb'};text-align:center;border-bottom:1px solid #e5e7eb">
        ${m?`<div style="font-size:4rem;margin-bottom:4px">${m.icon}</div><div style="font-size:24px;font-weight:800;color:${m.color}">${m.label}</div><div style="font-size:13px;color:#6b7280;margin-top:4px">Class mein ${rl} — ${total} students mein se</div>`:`<div style="font-size:2.5rem;margin-bottom:4px">🎓</div><div style="font-size:22px;font-weight:800;color:#374151">${rl} Position</div><div style="font-size:13px;color:#6b7280">Class mein ${rank}/${total}</div>`}
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;border-bottom:1px solid #e5e7eb">
        ${[['Marks',stats.totalObtained+'/'+stats.totalMax,'#6366f1'],['Percentage',stats.pct+'%',gc],['Grade',stats.grade,gc]].map(([l,v,c])=>`<div style="text-align:center;padding:16px 8px;border-right:1px solid #e5e7eb"><div style="font-size:22px;font-weight:800;color:${c}">${v}</div><div style="font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;margin-top:2px">${l}</div></div>`).join('')}
      </div>
      <div style="padding:14px 20px;border-bottom:1px solid #e5e7eb">
        <div style="display:flex;justify-content:space-between;font-size:12px;color:#6b7280;margin-bottom:5px"><span>Performance</span><span style="font-weight:700;color:${gc}">${stats.pct}%</span></div>
        <div style="background:#e5e7eb;border-radius:10px;height:12px;overflow:hidden"><div style="width:${stats.pct}%;background:linear-gradient(90deg,${gc},${gc}cc);height:100%;border-radius:10px"></div></div>
        <div style="display:flex;justify-content:space-between;font-size:10px;color:#9ca3af;margin-top:3px"><span>0%</span><span>50% Pass</span><span>100%</span></div>
      </div>
      ${subRows?`<div style="padding:14px 20px;border-bottom:1px solid #e5e7eb"><div style="font-size:13px;font-weight:700;color:#374151;margin-bottom:8px">📚 Subject-wise Marks</div><table style="width:100%;border-collapse:collapse"><thead><tr style="background:#f3f4f6"><th style="padding:6px 10px;font-size:11px;color:#6b7280;text-align:left">Subject</th><th style="padding:6px 10px;font-size:11px;color:#6b7280;text-align:center">Obtained</th><th style="padding:6px 10px;font-size:11px;color:#6b7280;text-align:center">Total</th><th style="padding:6px 10px;font-size:11px;color:#6b7280;text-align:center">Grade</th></tr></thead><tbody>${subRows}</tbody></table></div>`:''}
      <div style="padding:16px 20px;text-align:center;background:#f9fafb">
        <button onclick="document.getElementById('ml-overlay').style.display='none'" style="background:linear-gradient(135deg,#6366f1,#4f46e5);color:#fff;border:none;padding:10px 32px;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer">✅ Theek Hai, Close Karein</button>
        <div style="font-size:11px;color:#9ca3af;margin-top:8px">Hira Baitul Hamd School, Sukkur</div>
      </div>`;
    ov.style.display='flex';
    ov.onclick=e=>{if(e.target===ov)ov.style.display='none';};
    if(rank<=3) setTimeout(()=>confetti(),400);
  }
  function confetti() {
    const colors=['#f59e0b','#6366f1','#10b981','#ef4444','#3b82f6','#8b5cf6','#ec4899'];
    for(let i=0;i<90;i++){
      const el=document.createElement('div');
      const sz=Math.random()*10+5;
      el.style.cssText=`position:fixed;width:${sz}px;height:${sz}px;background:${colors[Math.floor(Math.random()*colors.length)]};top:-20px;left:${Math.random()*100}vw;border-radius:${Math.random()>.5?'50%':'2px'};z-index:10001;pointer-events:none`;
      document.body.appendChild(el);
      const dur=Math.random()*2000+1800;
      el.animate([{transform:`translateY(0) translateX(0) rotate(0deg)`,opacity:1},{transform:`translateY(110vh) translateX(${(Math.random()-.5)*200}px) rotate(${Math.random()*720}deg)`,opacity:0}],{duration:dur,easing:'cubic-bezier(.25,.46,.45,.94)'}).onfinish=()=>el.remove();
    }
  }
  function gen() {
    const cls=document.getElementById('ml-class')?.value, exam=document.getElementById('ml-exam')?.value;
    let students=DB.get('students');
    if(cls) students=students.filter(s=>s.cls===cls);
    const stats=calcStats(students,DB.get('results',[]),exam).sort((a,b)=>b.pct-a.pct);
    const area=document.getElementById('ml-area');
    if(!area) return;
    if(!stats.length){area.innerHTML=`<div class="card"><div class="card-body text-center py-5"><div style="font-size:3rem">📊</div><h5 class="mt-3 text-muted">Koi result nahi mila</h5><p class="text-muted">Results page pe pehle marks darj karein.</p></div></div>`;return;}
    const top3=stats.slice(0,3);
    const pCfg=[{c:'linear-gradient(135deg,#f59e0b,#d97706)',i:'🥇',p:'1st'},{c:'linear-gradient(135deg,#9ca3af,#6b7280)',i:'🥈',p:'2nd'},{c:'linear-gradient(135deg,#cd7c44,#a0522d)',i:'🥉',p:'3rd'}];
    const avg=Math.round(stats.reduce((s,x)=>s+x.pct,0)/stats.length);
    const gc=p=>p>=80?'#059669':p>=60?'#2563eb':p>=50?'#d97706':'#dc2626';
    area.innerHTML=`
      <div class="row g-3 mb-4">
        ${[['👥',stats.length,'Ranked Students','#6366f1,#4f46e5'],['🏆',(stats[0]?.pct||0)+'%','Top Score','#f59e0b,#d97706'],['📊',avg+'%','Class Average','#10b981,#059669'],['✅',stats.filter(s=>s.pct>=50).length,'Pass (≥50%)','#3b82f6,#2563eb']].map(([ic,v,l,gr])=>`<div class="col-md-3"><div class="card text-center" style="background:linear-gradient(135deg,${gr});color:#fff"><div class="card-body py-3"><div style="font-size:1.5rem">${ic}</div><div style="font-size:1.8rem;font-weight:700">${v}</div><div style="font-size:11px;opacity:.85">${l}</div></div></div></div>`).join('')}
      </div>
      <div class="card mb-4"><div class="card-body">
        <h6 class="fw-bold text-center mb-4">🏆 Top 3 Students</h6>
        <div class="d-flex justify-content-center gap-3 flex-wrap">
          ${top3.map((s,i)=>`<div class="text-center" style="background:${pCfg[i].c};color:#fff;padding:20px 24px;border-radius:16px;min-width:150px;box-shadow:0 4px 15px rgba(0,0,0,.15)"><div style="font-size:3rem">${pCfg[i].i}</div><div style="font-size:15px;font-weight:700;margin-top:8px">${s.name}</div><div style="font-size:12px;opacity:.85">${s.cls} ${s.section||''}</div><div style="font-size:24px;font-weight:700;margin-top:8px">${s.pct}%</div><div style="font-size:11px;opacity:.8">${s.totalObtained}/${s.totalMax}</div><div style="background:rgba(255,255,255,.25);border-radius:20px;padding:2px 12px;font-size:13px;font-weight:700;margin-top:6px;display:inline-block">${s.grade}</div></div>`).join('')}
        </div>
      </div></div>
      <div class="card" id="ml-print-area"><div class="card-body">
        <div class="d-flex justify-content-between align-items-center mb-3"><h6 class="fw-bold mb-0">📋 Complete Merit List ${cls?'— '+cls:''} ${exam?'('+exam+')':''}</h6><span class="badge bg-primary">${stats.length} Students</span></div>
        <div class="table-container"><table class="table table-hover align-middle">
          <thead><tr style="background:linear-gradient(135deg,#1e3a8a,#3b82f6)">${['Rank','Student','Roll No','Class','Marks','Percentage','Grade','Position'].map(h=>`<th style="color:#fff;font-size:13px">${h}</th>`).join('')}</tr></thead>
          <tbody>${stats.map((s,i)=>{const ri=i===0?'🥇':i===1?'🥈':i===2?'🥉':'#'+(i+1);const rb=i===0?'#fef9c3':i===1?'#f1f5f9':i===2?'#fdf3e9':'';const g=gc(s.pct);const rl=i===0?'1st':i===1?'2nd':i===2?'3rd':(i+1)+'th';return `<tr style="background:${rb}"><td style="font-size:18px;text-align:center">${ri}</td><td><div class="d-flex align-items-center gap-2">${s.photo?`<img src="${s.photo}" style="width:34px;height:34px;border-radius:50%;object-fit:cover">`:`<div style="width:34px;height:34px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-size:14px;font-weight:700">${s.name[0]}</div>`}<div><div style="font-weight:600;font-size:14px">${s.name}</div><div style="font-size:11px;color:#6b7280">${s.father||''}</div></div></div></td><td><span style="background:#e0e7ff;color:#3730a3;padding:2px 8px;border-radius:8px;font-weight:700;font-size:12px">${s.roll}</span></td><td>${s.cls} ${s.section||''}</td><td style="font-weight:700;font-size:15px;color:#1e3a8a">${s.totalObtained}<span style="color:#9ca3af;font-size:12px;font-weight:400">/${s.totalMax}</span></td><td><div class="d-flex align-items-center gap-2"><div style="flex:1;background:#e5e7eb;border-radius:8px;height:8px;min-width:50px;overflow:hidden"><div style="width:${s.pct}%;background:${g};height:100%;border-radius:8px"></div></div><span style="font-weight:700;color:${g};min-width:38px">${s.pct}%</span></div></td><td><span style="background:${g};color:#fff;padding:3px 10px;border-radius:12px;font-weight:700;font-size:13px">${s.grade}</span></td><td style="font-weight:700;color:${i<3?'#d97706':'#374151'}">${rl}</td></tr>`;}).join('')}</tbody>
        </table></div>
      </div></div>`;
  }
  function print() {
    const area=document.getElementById('ml-print-area');
    if(!area) return;
    const cls=document.getElementById('ml-class')?.value, exam=document.getElementById('ml-exam')?.value;
    const w=window.open('','_blank');
    w.document.write(`<html><head><title>Merit List</title><link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet"><style>body{font-family:Arial,sans-serif;padding:20px}.school-header{text-align:center;border-bottom:3px solid #1e3a8a;padding-bottom:16px;margin-bottom:20px}@media print{body{padding:0}}</style></head><body><div class="school-header"><h2 style="color:#1e3a8a">Hira Baitul Hamd School, Sukkur</h2><h4>Merit List — ${cls||'All Classes'} ${exam?'('+exam+')':''}</h4><p style="color:#6b7280;font-size:13px">${new Date().toLocaleDateString('en-PK')}</p></div>${area.innerHTML}<script>window.onload=()=>window.print()<\/script></body></html>`);
    w.document.close();
  }
  return {render,showPopup,gen,print};
})();
