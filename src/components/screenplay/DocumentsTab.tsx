import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Project } from '@/types/screenplay';
import { ResearchBoard } from './ResearchBoard';
import { useTheme, needsWhiteText } from '@/hooks/useTheme';
import { jsPDF } from 'jspdf';
import {
  FlaskConical, FileStack, Plus, Trash2, Calendar, Clock,
  Users, X, Clapperboard, ChevronRight, ChevronLeft,
  Phone, Mail, PanelRightClose, PanelRight, ChevronDown, Check,
  Download, GripVertical, Save, FolderOpen, Film,
} from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PersonEntry {
  id: string; name: string; email: string; phone: string;
  role?: string; department?: string; callTime?: string; walkieChannel?: string;
  character?: string; makeup?: string; pickup?: string; status?: string; notes?: string;
}

interface SceneRow {
  id: string; sceneNo: string; intExt: string; location: string;
  description: string; cast: string; pages: string; estimatedTime: string;
}

interface LocationRow {
  id: string; name: string; address: string; parking: string; phone: string; notes: string;
}

interface ScheduleRow {
  id: string; label: string; time: string;
}

type SectionKey = 'schedule' | 'contacts' | 'scenes' | 'talent' | 'crew' | 'locations' | 'special' | 'footer';

interface GeneralFieldToggles {
  shootingCall: boolean; lunch: boolean; estWrap: boolean;
  weather: boolean; productionNotes: boolean; nearestHospital: boolean;
}

interface CallSheet {
  id: string; name: string; shootDay: number; totalDays: number; date: string;
  sectionOrder: SectionKey[];
  sections: Record<SectionKey, boolean>;
  generalFieldToggles: GeneralFieldToggles;
  headerProduction: string; headerContact: string; headerLocation: string;
  generalCall: string; shootingCall: string; lunch: string; estWrap: string;
  nearestHospital: string; weather: string; generalNotes: string;
  schedule: ScheduleRow[];
  selectedCast: string[]; selectedCrew: string[];
  callTimeOverrides: Record<string, string>;
  scenes: SceneRow[]; locations: LocationRow[];
  special: string; footerLeft: string; footerCenter: string; footerRight: string;
}

interface ProjectRoster { crew: PersonEntry[]; cast: PersonEntry[]; }
interface CallSheetTemplate { id: string; name: string; sheet: Partial<CallSheet>; }

// ─── Constants ────────────────────────────────────────────────────────────────

const CREW_ROLES = [
  'Director','Producer','Executive Producer','Line Producer',
  'DP / Cinematographer','1st AD','2nd AD','UPM',
  'Production Coordinator','Production Designer','Art Director',
  'Costume Designer','Hair & Makeup','Gaffer','Best Boy Electric',
  'Key Grip','Best Boy Grip','Sound Mixer','Boom Operator',
  '1st AC','2nd AC','Script Supervisor','Stunt Coordinator',
  'VFX Supervisor','Location Manager','Set Medic',
  'Transportation Captain','Unit Manager','Production Assistant','Other',
];

const ROLE_TO_DEPT: Record<string, string> = {
  'Director':'Production','Producer':'Production','Executive Producer':'Production',
  'Line Producer':'Production','UPM':'Production','Production Coordinator':'Production',
  'Unit Manager':'Production','1st AD':'Production','2nd AD':'Production',
  'DP / Cinematographer':'Camera','1st AC':'Camera','2nd AC':'Camera',
  'Script Supervisor':'Camera',
  'Gaffer':'Lighting','Best Boy Electric':'Lighting',
  'Key Grip':'Grip','Best Boy Grip':'Grip',
  'Sound Mixer':'Sound','Boom Operator':'Sound',
  'Production Designer':'Art','Art Director':'Art',
  'Costume Designer':'Costume','Hair & Makeup':'Hair & Makeup',
  'VFX Supervisor':'VFX','Stunt Coordinator':'Stunts',
  'Location Manager':'Locations','Set Medic':'Medical',
  'Transportation Captain':'Transport','Production Assistant':'Production',
};

// Priority contact roles shown in header
const PRIORITY_ROLES = [
  'Director','Producer','1st AD','2nd AD','Production Coordinator',
  'Location Manager','Set Medic','Transportation Captain','UPM','Unit Manager',
];

const SCHEDULE_OPTIONS = [
  'Crew Call','Cast Call','Breakfast','Shooting Call',
  'Lunch','Dinner','Company Move','Wrap','Last Looks','Other',
];

const DEFAULT_SECTION_ORDER: SectionKey[] = [
  'schedule','contacts','scenes','talent','crew','locations','special','footer'
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const makeSheet = (shootDay: number, date: string, prod = ''): CallSheet => ({
  id: crypto.randomUUID(), name: `Day ${shootDay}`, shootDay, totalDays: 1, date,
  sectionOrder: [...DEFAULT_SECTION_ORDER],
  sections: { schedule: true, contacts: true, scenes: true, talent: true, crew: true, locations: true, special: false, footer: true },
  generalFieldToggles: { shootingCall: true, lunch: true, estWrap: true, weather: false, productionNotes: false, nearestHospital: false },
  headerProduction: prod, headerContact: '', headerLocation: '',
  generalCall: '', shootingCall: '', lunch: '1:00pm', estWrap: '',
  nearestHospital: '', weather: '', generalNotes: '',
  schedule: [{ id: crypto.randomUUID(), label: 'Crew Call', time: '' }],
  selectedCast: [], selectedCrew: [], callTimeOverrides: {},
  scenes: [], locations: [],
  special: '', footerLeft: 'CONFIDENTIAL', footerCenter: '', footerRight: '',
});

const makeScene = (): SceneRow => ({ id: crypto.randomUUID(), sceneNo: '', intExt: 'INT', location: '', description: '', cast: '', pages: '', estimatedTime: '' });
const makeLoc = (): LocationRow => ({ id: crypto.randomUUID(), name: '', address: '', parking: '', phone: '', notes: '' });
const makePerson = (isCrew: boolean): PersonEntry => ({
  id: crypto.randomUUID(), name: '', email: '', phone: '',
  ...(isCrew ? { role: '', department: '', callTime: '', walkieChannel: '' }
             : { character: '', makeup: '', pickup: '', status: '', notes: '' }),
});

const todayStr = () => new Date().toISOString().slice(0, 10);
const fmtDate = (d: string) => { try { return new Date(d + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }); } catch { return d; } };

function loadSheets(pid: string): CallSheet[] { try { const r = localStorage.getItem(`callsheets_v4_${pid}`); return r ? JSON.parse(r) : []; } catch { return []; } }
function saveSheets(pid: string, s: CallSheet[]) { try { localStorage.setItem(`callsheets_v4_${pid}`, JSON.stringify(s)); } catch {} }
function loadRoster(pid: string): ProjectRoster { try { const r = localStorage.getItem(`roster_v2_${pid}`); return r ? JSON.parse(r) : { crew: [], cast: [] }; } catch { return { crew: [], cast: [] }; } }
function saveRoster(pid: string, r: ProjectRoster) { try { localStorage.setItem(`roster_v2_${pid}`, JSON.stringify(r)); } catch {} }
function loadTemplates(): CallSheetTemplate[] { try { const r = localStorage.getItem('callsheet_templates'); return r ? JSON.parse(r) : []; } catch { return []; } }
function saveTemplates(t: CallSheetTemplate[]) { try { localStorage.setItem('callsheet_templates', JSON.stringify(t)); } catch {} }

// ─── Dark UI shared styles ────────────────────────────────────────────────────

const dInp = (extra: React.CSSProperties = {}): React.CSSProperties => ({ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 5, padding: '6px 10px', color: 'white', fontSize: 12, outline: 'none', width: '100%', ...extra });
const dSel = (extra: React.CSSProperties = {}): React.CSSProperties => ({ background: '#252535', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 5, padding: '6px 10px', color: 'rgba(255,255,255,0.85)', fontSize: 12, outline: 'none', width: '100%', ...extra });
const lbl9: React.CSSProperties = { fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.35)', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' };

// ─── PDF Export ───────────────────────────────────────────────────────────────

function exportCallSheetPDF(sheet: CallSheet, roster: ProjectRoster) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const PW = 595.28, PH = 841.89;
  const ML = 40, MR = 40, MT = 40;
  let y = MT;
  const maxY = PH - 40;

  const selectedCrew = roster.crew.filter(p => sheet.selectedCrew.includes(p.id));
  const selectedCast = roster.cast.filter(p => sheet.selectedCast.includes(p.id));

  const line = (x1: number, y1: number, x2: number, y2: number, w = 0.5) => { doc.setLineWidth(w); doc.line(x1, y1, x2, y2); };
  const check = () => { if (y > maxY - 40) { doc.addPage(); y = MT; } };

  // ── Header ──
  doc.setFillColor(20, 20, 35); doc.rect(ML, y, PW - ML - MR, 70, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(18); doc.setTextColor(255, 255, 255);
  doc.text(sheet.headerProduction || 'Untitled Production', ML + 12, y + 24);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(180, 180, 200);
  doc.text(sheet.headerLocation || '', ML + 12, y + 38);
  doc.text(sheet.headerContact || '', ML + 12, y + 50);

  // Day + date
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(255, 255, 255);
  doc.text(`DAY ${sheet.shootDay} OF ${sheet.totalDays}`, PW - MR - 12, y + 20, { align: 'right' });
  doc.setFontSize(13);
  doc.text(fmtDate(sheet.date), PW - MR - 12, y + 36, { align: 'right' });

  // General call
  if (sheet.generalCall) {
    doc.setFontSize(9); doc.setTextColor(150, 150, 180);
    doc.text('GENERAL CALL TIME', (PW / 2), y + 18, { align: 'center' });
    doc.setFontSize(22); doc.setTextColor(255, 255, 255);
    doc.text(sheet.generalCall, PW / 2, y + 48, { align: 'center' });
  }
  y += 80;

  // Schedule row
  if (sheet.sections.schedule && sheet.schedule.length > 0) {
    doc.setFillColor(235, 237, 245); doc.rect(ML, y, PW - ML - MR, 22, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(60, 60, 80);
    const colW = (PW - ML - MR) / Math.min(sheet.schedule.length, 5);
    sheet.schedule.slice(0, 5).forEach((row, i) => {
      const cx = ML + colW * i + colW / 2;
      doc.text(row.label.toUpperCase(), cx, y + 8, { align: 'center' });
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(20, 20, 50);
      doc.text(row.time || '—', cx, y + 18, { align: 'center' });
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(60, 60, 80);
    });
    y += 28;
  }

  const sectionHeader = (title: string) => {
    check();
    doc.setFillColor(20, 20, 35); doc.rect(ML, y, PW - ML - MR, 16, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(200, 200, 220);
    doc.text(title.toUpperCase(), ML + 8, y + 11);
    y += 20;
  };

  const th = (headers: string[], widths: number[], startX = ML) => {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(80, 80, 100);
    let x = startX;
    headers.forEach((h, i) => { doc.text(h, x + 3, y + 9); x += widths[i]; });
    line(ML, y + 12, PW - MR, y + 12);
    y += 14;
  };

  const td = (cols: string[], widths: number[], rowI: number, startX = ML) => {
    check();
    if (rowI % 2 === 1) { doc.setFillColor(245, 246, 250); doc.rect(startX, y - 2, widths.reduce((a, b) => a + b, 0), 16, 'F'); }
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(20, 20, 40);
    let x = startX;
    cols.forEach((c, i) => { const txt = doc.splitTextToSize(c || '—', widths[i] - 6); doc.text(txt[0] || '', x + 3, y + 9); x += widths[i]; });
    y += 16;
  };

  // Locations
  if (sheet.sections.locations && sheet.locations.length > 0) {
    sectionHeader('📍 Locations');
    const W = PW - ML - MR;
    th(['#', 'Set Location', 'Address', 'Parking', 'Phone', 'Notes'], [18, W*0.2, W*0.25, W*0.18, W*0.12, W*0.18]);
    sheet.locations.forEach((loc, i) => td([String(i+1), loc.name, loc.address, loc.parking, loc.phone, loc.notes], [18, W*0.2, W*0.25, W*0.18, W*0.12, W*0.18], i));
    y += 8;
  }

  // Talent
  if (sheet.sections.talent && selectedCast.length > 0) {
    sectionHeader(`🎭 Talent — ${selectedCast.length} Total`);
    const W = PW - ML - MR;
    th(['Name', 'Character', 'Status', 'Pickup', 'Call', 'H/MU'], [W*0.22, W*0.2, W*0.12, W*0.12, W*0.12, W*0.1]);
    selectedCast.forEach((p, i) => {
      const call = sheet.callTimeOverrides[p.id] || p.callTime || '';
      td([p.name, p.character||'', p.status||'', p.pickup||'', call, p.makeup||''], [W*0.22, W*0.2, W*0.12, W*0.12, W*0.12, W*0.1], i);
    });
    y += 8;
  }

  // Crew grouped by dept
  if (sheet.sections.crew && selectedCrew.length > 0) {
    sectionHeader(`🎬 Crew — ${selectedCrew.length} Total`);
    const depts = selectedCrew.reduce<Record<string, PersonEntry[]>>((acc, p) => { const d = p.department||'Other'; (acc[d] = acc[d]||[]).push(p); return acc; }, {});
    const colW = (PW - ML - MR - 12) / 2;
    const deptKeys = Object.keys(depts);
    let rowI = 0;
    for (let di = 0; di < deptKeys.length; di += 2) {
      const left = deptKeys[di], right = deptKeys[di + 1];
      // Dept headers
      check();
      doc.setFillColor(30, 35, 60); doc.rect(ML, y, colW, 14, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(180, 190, 220);
      doc.text(left.toUpperCase(), ML + 4, y + 10);
      if (right) {
        doc.setFillColor(30, 35, 60); doc.rect(ML + colW + 12, y, colW, 14, 'F');
        doc.text(right.toUpperCase(), ML + colW + 16, y + 10);
      }
      y += 16;

      const maxRows = Math.max(depts[left].length, right ? depts[right].length : 0);
      for (let ri = 0; ri < maxRows; ri++) {
        check();
        if (rowI % 2 === 0) { doc.setFillColor(245, 246, 250); doc.rect(ML, y - 2, colW, 18, 'F'); if (right) doc.rect(ML + colW + 12, y - 2, colW, 18, 'F'); }
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(20, 20, 40);
        const lp = depts[left][ri];
        if (lp) {
          doc.setFont('helvetica', 'bold'); doc.text(lp.name, ML + 4, y + 8);
          doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(80, 80, 110); doc.text(lp.role||'', ML + 4, y + 16);
          doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(20, 20, 40);
          const lc = sheet.callTimeOverrides[lp.id] || lp.callTime || '';
          doc.text(lc, ML + colW - 4, y + 10, { align: 'right' });
        }
        const rp = right ? depts[right][ri] : null;
        if (rp) {
          doc.setFont('helvetica', 'bold'); doc.text(rp.name, ML + colW + 16, y + 8);
          doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(80, 80, 110); doc.text(rp.role||'', ML + colW + 16, y + 16);
          doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(20, 20, 40);
          const rc = sheet.callTimeOverrides[rp.id] || rp.callTime || '';
          doc.text(rc, ML + colW * 2 + 8, y + 10, { align: 'right' });
        }
        y += 20; rowI++;
      }
      y += 4;
    }
    y += 4;
  }

  // Scenes
  if (sheet.sections.scenes && sheet.scenes.length > 0) {
    sectionHeader('🎥 Scenes');
    const W = PW - ML - MR;
    th(['Sc#', 'Int/Ext', 'Location', 'Description', 'Cast', 'Pgs', 'Est.'], [28, 42, W*0.18, W*0.22, W*0.16, 30, 40]);
    sheet.scenes.forEach((r, i) => td([r.sceneNo, r.intExt, r.location, r.description, r.cast, r.pages, r.estimatedTime], [28, 42, W*0.18, W*0.22, W*0.16, 30, 40], i));
    y += 8;
  }

  // Special
  if (sheet.sections.special && sheet.special) {
    sectionHeader('⚠ Special Instructions');
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(30, 30, 50);
    const wrapped = doc.splitTextToSize(sheet.special, PW - ML - MR - 16);
    wrapped.forEach((l: string) => { check(); doc.text(l, ML + 8, y + 10); y += 13; });
    y += 6;
  }

  // General notes
  if (sheet.generalNotes) {
    sectionHeader('General Notes');
    doc.setFont('helvetica', 'italic'); doc.setFontSize(8.5); doc.setTextColor(60, 60, 80);
    const wrapped = doc.splitTextToSize(sheet.generalNotes, PW - ML - MR - 16);
    wrapped.forEach((l: string) => { check(); doc.text(l, ML + 8, y + 10); y += 13; });
    y += 6;
  }

  // Footer
  if (sheet.sections.footer) {
    const fy = PH - 28;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(120, 120, 140);
    line(ML, fy - 4, PW - MR, fy - 4, 0.3);
    if (sheet.footerLeft) doc.text(sheet.footerLeft, ML, fy + 8);
    if (sheet.footerCenter) doc.text(sheet.footerCenter, PW / 2, fy + 8, { align: 'center' });
    if (sheet.footerRight) doc.text(sheet.footerRight, PW - MR, fy + 8, { align: 'right' });
  }

  doc.save(`${sheet.name || 'call-sheet'}.pdf`);
}

// ─── PersonCard (module-level to prevent remount) ─────────────────────────────

interface PersonCardProps { person: PersonEntry; isCrew: boolean; onUpdate: (p: Partial<PersonEntry>) => void; onDelete: () => void; }

function PersonCard({ person, isCrew, onUpdate, onDelete }: PersonCardProps) {
  const [expanded, setExpanded] = useState(false);
  const accent = isCrew ? '#4d9fff' : '#a855f7';
  const accentBg = isCrew ? 'rgba(77,159,255,0.12)' : 'rgba(168,85,247,0.12)';
  const subtitle = isCrew ? [person.role, person.department].filter(Boolean).join(' · ') : person.character || '';

  const handleRoleChange = (role: string) => {
    const dept = ROLE_TO_DEPT[role] || person.department || '';
    onUpdate({ role, department: dept });
  };

  return (
    <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.07)', marginBottom: 6, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', cursor: 'pointer' }} onClick={() => setExpanded(v => !v)}>
        <div style={{ width: 30, height: 30, borderRadius: '50%', background: accentBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: accent, fontWeight: 800, flexShrink: 0 }}>
          {person.name ? person.name[0].toUpperCase() : '?'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: person.name ? 'white' : 'rgba(255,255,255,0.3)' }}>{person.name || 'Unnamed'}</div>
          {subtitle && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 1 }}>{subtitle}</div>}
        </div>
        <button onClick={e => { e.stopPropagation(); onDelete(); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.2)', padding: 4 }}
          onMouseEnter={e => (e.currentTarget.style.color = '#f87171')} onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.2)')}>
          <Trash2 style={{ width: 13, height: 13 }} />
        </button>
        <ChevronDown style={{ width: 14, height: 14, color: 'rgba(255,255,255,0.3)', transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }} />
      </div>
      {expanded && (
        <div style={{ padding: '0 12px 12px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ marginTop: 10 }}>
            <label style={lbl9}>Full Name</label>
            <input value={person.name} onChange={e => onUpdate({ name: e.target.value })} placeholder="Full name" style={dInp()} />
          </div>
          {isCrew ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
              <div>
                <label style={lbl9}>Role</label>
                <select value={person.role ?? ''} onChange={e => handleRoleChange(e.target.value)} style={dSel()}>
                  <option value="">Select role…</option>
                  {CREW_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl9}>Department</label>
                <select value={person.department ?? ''} onChange={e => onUpdate({ department: e.target.value })} style={dSel()}>
                  <option value="">Department…</option>
                  {['Production','Camera','Lighting','Grip','Sound','Art','Costume','Hair & Makeup','VFX','Stunts','Locations','Medical','Transport','Other'].map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl9}>Default Call Time</label>
                <input value={person.callTime ?? ''} onChange={e => onUpdate({ callTime: e.target.value })} placeholder="07:00" style={dInp({ fontFamily: 'monospace' })} />
              </div>
              <div>
                <label style={lbl9}>Walkie Channel</label>
                <input value={person.walkieChannel ?? ''} onChange={e => onUpdate({ walkieChannel: e.target.value })} placeholder="Ch. 1" style={dInp()} />
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
              <div><label style={lbl9}>Character / Role</label><input value={person.character ?? ''} onChange={e => onUpdate({ character: e.target.value })} placeholder="e.g. Detective Shaw" style={dInp()} /></div>
              <div><label style={lbl9}>Default Call Time</label><input value={person.callTime ?? ''} onChange={e => onUpdate({ callTime: e.target.value })} placeholder="07:00" style={dInp({ fontFamily: 'monospace' })} /></div>
              <div><label style={lbl9}>Makeup Call</label><input value={person.makeup ?? ''} onChange={e => onUpdate({ makeup: e.target.value })} placeholder="06:00" style={dInp({ fontFamily: 'monospace' })} /></div>
              <div><label style={lbl9}>Status</label><input value={person.status ?? ''} onChange={e => onUpdate({ status: e.target.value })} placeholder="Confirmed" style={dInp()} /></div>
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
            <div><label style={lbl9}>Email</label><div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Mail style={{ width: 12, height: 12, color: 'rgba(255,255,255,0.25)', flexShrink: 0 }} /><input value={person.email} onChange={e => onUpdate({ email: e.target.value })} placeholder="email@example.com" style={dInp()} /></div></div>
            <div><label style={lbl9}>Phone</label><div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Phone style={{ width: 12, height: 12, color: 'rgba(255,255,255,0.25)', flexShrink: 0 }} /><input value={person.phone} onChange={e => onUpdate({ phone: e.target.value })} placeholder="+353 00 000 0000" style={dInp()} /></div></div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Person Modal ─────────────────────────────────────────────────────────────

type ModalTab = 'crew' | 'cast' | 'sheet';

function PersonModal({ open, onClose, roster, onRosterChange, sheet, onSheetChange }: {
  open: boolean; onClose: () => void; roster: ProjectRoster; onRosterChange: (r: ProjectRoster) => void;
  sheet: CallSheet; onSheetChange: (p: Partial<CallSheet>) => void;
}) {
  const [tab, setTab] = useState<ModalTab>('crew');

  const updateCrew = useCallback((id: string, patch: Partial<PersonEntry>) =>
    onRosterChange({ ...roster, crew: roster.crew.map(p => p.id === id ? { ...p, ...patch } : p) }), [roster, onRosterChange]);
  const updateCast = useCallback((id: string, patch: Partial<PersonEntry>) =>
    onRosterChange({ ...roster, cast: roster.cast.map(p => p.id === id ? { ...p, ...patch } : p) }), [roster, onRosterChange]);
  const delCrew = useCallback((id: string) => {
    onRosterChange({ ...roster, crew: roster.crew.filter(p => p.id !== id) });
    onSheetChange({ selectedCrew: sheet.selectedCrew.filter(s => s !== id) });
  }, [roster, onRosterChange, sheet.selectedCrew, onSheetChange]);
  const delCast = useCallback((id: string) => {
    onRosterChange({ ...roster, cast: roster.cast.filter(p => p.id !== id) });
    onSheetChange({ selectedCast: sheet.selectedCast.filter(s => s !== id) });
  }, [roster, onRosterChange, sheet.selectedCast, onSheetChange]);

  const toggle = (type: 'crew' | 'cast', id: string) => {
    if (type === 'crew') {
      const sel = sheet.selectedCrew.includes(id) ? sheet.selectedCrew.filter(s => s !== id) : [...sheet.selectedCrew, id];
      onSheetChange({ selectedCrew: sel });
    } else {
      const sel = sheet.selectedCast.includes(id) ? sheet.selectedCast.filter(s => s !== id) : [...sheet.selectedCast, id];
      onSheetChange({ selectedCast: sel });
    }
  };

  const tabs = [
    { id: 'crew' as ModalTab, label: 'Roster – Crew', count: roster.crew.length },
    { id: 'cast' as ModalTab, label: 'Roster – Cast', count: roster.cast.length },
    { id: 'sheet' as ModalTab, label: 'On This Sheet', count: sheet.selectedCrew.length + sheet.selectedCast.length },
  ];

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent style={{ maxWidth: 580, width: '90vw', maxHeight: '88vh', display: 'flex', flexDirection: 'column', background: '#1a1a24', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: 0, gap: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px 0', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <h2 style={{ fontSize: 15, fontWeight: 800, color: 'white', margin: 0 }}>Cast &amp; Crew</h2>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', padding: 2 }}><X style={{ width: 16, height: 16 }} /></button>
          </div>
          <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            {tabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                style={{ padding: '7px 14px', fontSize: 11, fontWeight: 700, border: 'none', cursor: 'pointer', background: 'transparent', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: tab === t.id ? '2px solid #4d9fff' : '2px solid transparent', color: tab === t.id ? '#4d9fff' : 'rgba(255,255,255,0.35)', whiteSpace: 'nowrap' }}>
                {t.label} <span style={{ fontWeight: 400, opacity: 0.6 }}>({t.count})</span>
              </button>
            ))}
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 20px' }} className="custom-scrollbar">
          {tab === 'crew' && (
            <>
              {roster.crew.length === 0 && <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12, textAlign: 'center', padding: '24px 0' }}>No crew in roster yet</p>}
              {roster.crew.map(p => <PersonCard key={p.id} person={p} isCrew onUpdate={patch => updateCrew(p.id, patch)} onDelete={() => delCrew(p.id)} />)}
              <button onClick={() => onRosterChange({ ...roster, crew: [...roster.crew, makePerson(true)] })} style={{ width: '100%', padding: 10, background: 'rgba(77,159,255,0.07)', border: '1px dashed rgba(77,159,255,0.3)', borderRadius: 8, color: '#4d9fff', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Plus style={{ width: 14, height: 14 }} />Add crew member
              </button>
            </>
          )}
          {tab === 'cast' && (
            <>
              {roster.cast.length === 0 && <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12, textAlign: 'center', padding: '24px 0' }}>No cast in roster yet</p>}
              {roster.cast.map(p => <PersonCard key={p.id} person={p} isCrew={false} onUpdate={patch => updateCast(p.id, patch)} onDelete={() => delCast(p.id)} />)}
              <button onClick={() => onRosterChange({ ...roster, cast: [...roster.cast, makePerson(false)] })} style={{ width: '100%', padding: 10, background: 'rgba(168,85,247,0.07)', border: '1px dashed rgba(168,85,247,0.3)', borderRadius: 8, color: '#a855f7', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Plus style={{ width: 14, height: 14 }} />Add cast member
              </button>
            </>
          )}
          {tab === 'sheet' && (
            <>
              {roster.crew.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 8 }}>Crew</p>
                  {roster.crew.map(p => {
                    const sel = sheet.selectedCrew.includes(p.id);
                    return (
                      <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 7, background: sel ? 'rgba(77,159,255,0.08)' : 'rgba(255,255,255,0.03)', border: `1px solid ${sel ? 'rgba(77,159,255,0.25)' : 'rgba(255,255,255,0.06)'}`, marginBottom: 5, cursor: 'pointer' }}
                        onClick={() => toggle('crew', p.id)}>
                        <div style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${sel ? '#4d9fff' : 'rgba(255,255,255,0.2)'}`, background: sel ? '#4d9fff' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {sel && <Check style={{ width: 11, height: 11, color: 'white' }} />}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: sel ? 'white' : 'rgba(255,255,255,0.55)' }}>{p.name || 'Unnamed'}</div>
                          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>{[p.role, p.department].filter(Boolean).join(' · ')}</div>
                        </div>
                        {sel && <div onClick={e => e.stopPropagation()}><input value={sheet.callTimeOverrides[p.id] || p.callTime || ''} onChange={e => onSheetChange({ callTimeOverrides: { ...sheet.callTimeOverrides, [p.id]: e.target.value } })} placeholder="Call time" style={dInp({ width: 80, fontSize: 11, fontFamily: 'monospace', padding: '4px 8px' })} /></div>}
                      </div>
                    );
                  })}
                </div>
              )}
              {roster.cast.length > 0 && (
                <div>
                  <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 8 }}>Cast</p>
                  {roster.cast.map(p => {
                    const sel = sheet.selectedCast.includes(p.id);
                    return (
                      <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 7, background: sel ? 'rgba(168,85,247,0.08)' : 'rgba(255,255,255,0.03)', border: `1px solid ${sel ? 'rgba(168,85,247,0.25)' : 'rgba(255,255,255,0.06)'}`, marginBottom: 5, cursor: 'pointer' }}
                        onClick={() => toggle('cast', p.id)}>
                        <div style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${sel ? '#a855f7' : 'rgba(255,255,255,0.2)'}`, background: sel ? '#a855f7' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {sel && <Check style={{ width: 11, height: 11, color: 'white' }} />}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: sel ? 'white' : 'rgba(255,255,255,0.55)' }}>{p.name || 'Unnamed'}</div>
                          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>{p.character || 'No character'}</div>
                        </div>
                        {sel && <div onClick={e => e.stopPropagation()}><input value={sheet.callTimeOverrides[p.id] || p.callTime || ''} onChange={e => onSheetChange({ callTimeOverrides: { ...sheet.callTimeOverrides, [p.id]: e.target.value } })} placeholder="Call time" style={dInp({ width: 80, fontSize: 11, fontFamily: 'monospace', padding: '4px 8px' })} /></div>}
                      </div>
                    );
                  })}
                </div>
              )}
              {roster.crew.length === 0 && roster.cast.length === 0 && <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12, textAlign: 'center', padding: '24px 0' }}>Add people in the Roster tabs first</p>}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── New Sheet Dialog ─────────────────────────────────────────────────────────

function NewSheetDialog({ open, onClose, onCreate, nextDay }: { open: boolean; onClose: () => void; onCreate: (day: number, total: number, date: string) => void; nextDay: number; }) {
  const [day, setDay] = useState(String(nextDay)); const [total, setTotal] = useState('1'); const [date, setDate] = useState(todayStr());
  useEffect(() => { if (open) { setDay(String(nextDay)); setDate(todayStr()); } }, [open, nextDay]);
  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-xs" style={{ background: '#1e1e28', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}>
        <h2 style={{ fontSize: 15, fontWeight: 800, color: 'white', margin: '0 0 16px' }}>New Call Sheet</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div><label style={lbl9}>Shoot Day #</label><input type="number" min={1} value={day} onChange={e => setDay(e.target.value)} style={dInp()} /></div>
            <div><label style={lbl9}>Of # Days</label><input type="number" min={1} value={total} onChange={e => setTotal(e.target.value)} style={dInp()} /></div>
          </div>
          <div><label style={lbl9}>Date</label><input type="date" value={date} onChange={e => setDate(e.target.value)} style={dInp({ colorScheme: 'dark' } as any)} /></div>
          <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
            <button onClick={() => { onCreate(parseInt(day)||nextDay, parseInt(total)||1, date); onClose(); }} style={{ flex: 1, background: '#4d9fff', color: 'white', border: 'none', borderRadius: 6, padding: '9px 0', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Create</button>
            <button onClick={onClose} style={{ flex: 1, background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.5)', border: 'none', borderRadius: 6, padding: '9px 0', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Right Settings Sidebar ───────────────────────────────────────────────────

function SettingsSidebar({ sheet, onChange, isOpen, onToggle, width, onWidthChange, templates, onSaveTemplate, onLoadTemplate }: {
  sheet: CallSheet; onChange: (p: Partial<CallSheet>) => void;
  isOpen: boolean; onToggle: () => void; width: number; onWidthChange: (w: number) => void;
  templates: CallSheetTemplate[]; onSaveTemplate: () => void; onLoadTemplate: (t: CallSheetTemplate) => void;
}) {
  const dragRef = useRef(false); const startX = useRef(0); const startW = useRef(0);
  const [showTemplates, setShowTemplates] = useState(false);

  useEffect(() => {
    const onMove = (e: MouseEvent) => { if (!dragRef.current) return; onWidthChange(Math.min(360, Math.max(190, startW.current + (startX.current - e.clientX)))); };
    const onUp = () => { dragRef.current = false; document.body.style.cursor = ''; document.body.style.userSelect = ''; };
    window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [onWidthChange]);

  const Tog = ({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) => (
    <button onClick={onClick} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '5px 10px', borderRadius: 6, background: active ? 'rgba(77,159,255,0.08)' : 'transparent', border: 'none', cursor: 'pointer', marginBottom: 2 }}>
      <span style={{ fontSize: 11, color: active ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.3)' }}>{label}</span>
      <div style={{ width: 28, height: 15, borderRadius: 8, background: active ? '#4d9fff' : 'rgba(255,255,255,0.1)', position: 'relative', flexShrink: 0, transition: 'background 0.18s' }}>
        <div style={{ position: 'absolute', top: 2, left: active ? 15 : 2, width: 11, height: 11, borderRadius: '50%', background: 'white', transition: 'left 0.18s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
      </div>
    </button>
  );

  if (!isOpen) return (
    <div style={{ width: 36, borderLeft: '1px solid rgba(255,255,255,0.08)', background: '#16161a', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 8 }}>
      <button onClick={onToggle} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', padding: 6 }}><PanelRight style={{ width: 15, height: 15 }} /></button>
    </div>
  );

  return (
    <div style={{ width, flexShrink: 0, borderLeft: '1px solid rgba(255,255,255,0.08)', background: '#16161a', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <div onMouseDown={e => { dragRef.current = true; startX.current = e.clientX; startW.current = width; document.body.style.cursor = 'col-resize'; document.body.style.userSelect = 'none'; }} style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 5, cursor: 'col-resize', zIndex: 10 }} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.09em' }}>Sheet Options</span>
        <button onClick={onToggle} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', padding: 2 }}><PanelRightClose style={{ width: 14, height: 14 }} /></button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 6px' }} className="custom-scrollbar">
        <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.09em', padding: '4px 10px 6px' }}>Sections</p>
        {([['schedule','Schedule'],['contacts','Key Contacts'],['scenes','Scenes'],['talent','Talent'],['crew','Crew'],['locations','Locations'],['special','Special Instructions'],['footer','Footer']] as [SectionKey,string][]).map(([k,l]) => (
          <Tog key={k} label={l} active={sheet.sections[k]} onClick={() => onChange({ sections: { ...sheet.sections, [k]: !sheet.sections[k] } })} />
        ))}
        <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', margin: '10px 8px' }} />
        <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.09em', padding: '4px 10px 6px' }}>Extra Fields</p>
        {([['shootingCall','Shooting Call'],['lunch','Lunch'],['estWrap','Est. Wrap'],['weather','Weather'],['productionNotes','Production Notes'],['nearestHospital','Nearest Hospital']] as [keyof GeneralFieldToggles,string][]).map(([k,l]) => (
          <Tog key={k} label={l} active={sheet.generalFieldToggles[k]} onClick={() => onChange({ generalFieldToggles: { ...sheet.generalFieldToggles, [k]: !sheet.generalFieldToggles[k] } })} />
        ))}
        <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', margin: '10px 8px' }} />
        <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.09em', padding: '4px 10px 6px' }}>Templates</p>
        <div style={{ padding: '0 6px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <button onClick={onSaveTemplate} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 6, background: 'rgba(77,159,255,0.1)', border: '1px solid rgba(77,159,255,0.25)', color: '#4d9fff', fontSize: 11, cursor: 'pointer', width: '100%' }}>
            <Save style={{ width: 12, height: 12 }} />Save as template
          </button>
          {templates.length > 0 && (
            <div>
              <button onClick={() => setShowTemplates(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 6, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', fontSize: 11, cursor: 'pointer', width: '100%' }}>
                <FolderOpen style={{ width: 12, height: 12 }} />Load template ({templates.length})
              </button>
              {showTemplates && (
                <div style={{ marginTop: 4, background: 'rgba(255,255,255,0.04)', borderRadius: 6, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.07)' }}>
                  {templates.map(t => (
                    <button key={t.id} onClick={() => { onLoadTemplate(t); setShowTemplates(false); }}
                      style={{ display: 'block', width: '100%', padding: '7px 10px', background: 'none', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.7)', fontSize: 11, cursor: 'pointer', textAlign: 'left' }}>
                      {t.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Draggable Section Wrapper ────────────────────────────────────────────────

function DragSection({ id, index, total, onMove, children }: { id: string; index: number; total: number; onMove: (from: number, to: number) => void; children: React.ReactNode; }) {
  const dragOver = useRef<number | null>(null);
  return (
    <div
      draggable
      onDragStart={e => { e.dataTransfer.setData('sectionIndex', String(index)); e.dataTransfer.effectAllowed = 'move'; }}
      onDragOver={e => { e.preventDefault(); dragOver.current = index; }}
      onDrop={e => { const from = parseInt(e.dataTransfer.getData('sectionIndex')); if (!isNaN(from) && from !== index) onMove(from, index); }}
      style={{ display: 'flex', alignItems: 'flex-start', gap: 0 }}
    >
      <div title="Drag to reorder" style={{ paddingTop: 16, paddingRight: 4, cursor: 'grab', color: 'rgba(255,255,255,0.2)', flexShrink: 0 }}
        onMouseDown={e => e.stopPropagation()}>
        <GripVertical style={{ width: 14, height: 14 }} />
      </div>
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  );
}

// ─── A4 Call Sheet ─────────────────────────────────────────────────────────────

interface A4Props { sheet: CallSheet; onChange: (p: Partial<CallSheet>) => void; roster: ProjectRoster; pc: string; pt: string; onPeople: () => void; project: Project; }

function A4Sheet({ sheet, onChange, roster, pc, pt, onPeople, project }: A4Props) {
  const set = useCallback(<K extends keyof CallSheet>(k: K, v: CallSheet[K]) => onChange({ [k]: v }), [onChange]);
  const isLight = !needsWhiteText(pc);
  const accent = isLight ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.45)';
  const div = isLight ? '#d8d8d8' : 'rgba(255,255,255,0.1)';
  const rowAlt = isLight ? 'rgba(0,0,0,0.025)' : 'rgba(255,255,255,0.035)';
  const deptBg = '#1a2230';
  const deptText = 'rgba(255,255,255,0.75)';
  const [showScenePicker, setShowScenePicker] = useState(false);
  const [showScheduleAdd, setShowScheduleAdd] = useState(false);

  const selectedCrew = roster.crew.filter(p => sheet.selectedCrew.includes(p.id));
  const selectedCast = roster.cast.filter(p => sheet.selectedCast.includes(p.id));
  const crewByDept = selectedCrew.reduce<Record<string, PersonEntry[]>>((acc, p) => { const d = p.department||'Other'; (acc[d]=acc[d]||[]).push(p); return acc; }, {});

  // Priority contacts from selected crew
  const contacts = PRIORITY_ROLES.map(role => selectedCrew.find(p => p.role === role)).filter(Boolean) as PersonEntry[];

  // Scenes from script
  const scriptScenes = useMemo(() => project.lines.filter(l => l.type === 'scene-heading' && l.text.trim()).map((l, i) => ({ index: i, text: l.text.trim() })), [project.lines]);

  const inp = (val: string, onCh: (v: string) => void, extra: React.CSSProperties = {}, placeholder = '') => (
    <input value={val} onChange={e => onCh(e.target.value)} placeholder={placeholder} style={{ background: 'transparent', border: 'none', borderBottom: `1px solid ${div}`, outline: 'none', color: pt, fontSize: 11, padding: '2px 3px', width: '100%', ...extra }} />
  );

  const thS: React.CSSProperties = { padding: '5px 8px', textAlign: 'left', fontSize: 8, fontWeight: 800, color: accent, textTransform: 'uppercase', letterSpacing: '0.1em', borderBottom: `2px solid ${div}` };
  const tdS: React.CSSProperties = { padding: '6px 8px', fontSize: 10, color: pt, borderBottom: `1px solid ${div}`, verticalAlign: 'top' };

  const SH = ({ text, children }: { text: string; children?: React.ReactNode }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, paddingBottom: 6, borderBottom: `2px solid ${pt}` }}>
      <span style={{ fontSize: 13, fontWeight: 800, color: pt }}>{text}</span>
      {children}
    </div>
  );

  const manBtn = <button onClick={onPeople} style={{ fontSize: 9, color: accent, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}><Users style={{ width: 10, height: 10 }} />Manage</button>;

  const moveSection = (from: number, to: number) => {
    const order = [...sheet.sectionOrder];
    const [moved] = order.splice(from, 1);
    order.splice(to, 0, moved);
    set('sectionOrder', order);
  };

  const updateScene = (id: string, p: Partial<SceneRow>) => set('scenes', sheet.scenes.map(r => r.id === id ? { ...r, ...p } : r));
  const updateLoc = (id: string, p: Partial<LocationRow>) => set('locations', sheet.locations.map(r => r.id === id ? { ...r, ...p } : r));
  const updateSchedule = (id: string, p: Partial<ScheduleRow>) => set('schedule', sheet.schedule.map(r => r.id === id ? { ...r, ...p } : r));

  const sectionOrder = sheet.sectionOrder || DEFAULT_SECTION_ORDER;
  const visibleSections = sectionOrder.filter(k => sheet.sections[k]);

  const renderSection = (key: SectionKey, index: number) => {
    if (!sheet.sections[key]) return null;

    const director = selectedCrew.find(p => p.role === 'Director');
    const ad1 = selectedCrew.find(p => p.role === '1st AD');

    let content: React.ReactNode = null;

    switch (key) {
      case 'schedule':
        content = (
          <div style={{ marginBottom: 20 }}>
            <SH text="Schedule" />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 0, borderRadius: 4, overflow: 'hidden', border: `1px solid ${div}` }}>
              {sheet.schedule.map((row, i) => (
                <div key={row.id} style={{ flex: '1 1 120px', padding: '10px 12px', borderRight: i < sheet.schedule.length - 1 ? `1px solid ${div}` : 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: accent, textTransform: 'uppercase', letterSpacing: '0.09em', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>{row.label}</span>
                    {sheet.schedule.length > 1 && <button onClick={() => set('schedule', sheet.schedule.filter(r => r.id !== row.id))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: accent, padding: 0 }}><X style={{ width: 9, height: 9 }} /></button>}
                  </div>
                  <input value={row.time} onChange={e => updateSchedule(row.id, { time: e.target.value })} placeholder="9:30am"
                    style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: 14, fontWeight: 800, color: pt, width: '100%', fontFamily: 'monospace' }} />
                </div>
              ))}
              <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', position: 'relative' }}>
                <button onClick={() => setShowScheduleAdd(v => !v)} style={{ background: 'none', border: `1px dashed ${div}`, borderRadius: 4, padding: '4px 8px', color: accent, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 10 }}>
                  <Plus style={{ width: 10, height: 10 }} />Add
                </button>
                {showScheduleAdd && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, background: '#1e1e2e', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: 6, zIndex: 50, minWidth: 160, boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
                    {SCHEDULE_OPTIONS.map(opt => (
                      <button key={opt} onClick={() => { set('schedule', [...sheet.schedule, { id: crypto.randomUUID(), label: opt, time: '' }]); setShowScheduleAdd(false); }}
                        style={{ display: 'block', width: '100%', padding: '6px 10px', background: 'none', border: 'none', color: 'rgba(255,255,255,0.8)', fontSize: 11, cursor: 'pointer', textAlign: 'left', borderRadius: 4 }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(77,159,255,0.12)')} onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                        {opt}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
        break;

      case 'contacts':
        if (contacts.length === 0 && !director && !ad1) return null;
        content = (
          <div style={{ marginBottom: 20 }}>
            <SH text="Key Contacts" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
              {contacts.map(p => (
                <div key={p.id} style={{ padding: '8px 10px', borderRadius: 5, background: rowAlt, border: `1px solid ${div}` }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: pt }}>{p.name}</div>
                  <div style={{ fontSize: 9, color: accent, marginBottom: 4 }}>{p.role}</div>
                  {p.phone && <div style={{ fontSize: 10, color: pt, fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: 4 }}><Phone style={{ width: 9, height: 9, color: accent }} />{p.phone}</div>}
                </div>
              ))}
            </div>
          </div>
        );
        break;

      case 'scenes':
        content = (
          <div style={{ marginBottom: 20 }}>
            <SH text="🎥 Scenes">
              <div style={{ display: 'flex', gap: 6 }}>
                <div style={{ position: 'relative' }}>
                  <button onClick={() => setShowScenePicker(v => !v)} style={{ fontSize: 9, color: accent, background: 'none', border: `1px dashed ${div}`, borderRadius: 4, padding: '3px 7px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}>
                    <Film style={{ width: 10, height: 10 }} />From script
                  </button>
                  {showScenePicker && scriptScenes.length > 0 && (
                    <div style={{ position: 'absolute', top: '100%', right: 0, background: '#1e1e2e', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: 6, zIndex: 50, minWidth: 260, maxHeight: 200, overflowY: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }} className="custom-scrollbar">
                      {scriptScenes.map((s, i) => (
                        <button key={i} onClick={() => {
                          const parts = s.text.split(' - ');
                          const loc = parts.slice(1).join(' - ').trim() || s.text;
                          const intExt = s.text.toUpperCase().startsWith('EXT') ? 'EXT' : 'INT';
                          set('scenes', [...sheet.scenes, { id: crypto.randomUUID(), sceneNo: String(i+1), intExt, location: loc, description: '', cast: '', pages: '', estimatedTime: '' }]);
                          setShowScenePicker(false);
                        }} style={{ display: 'block', width: '100%', padding: '6px 10px', background: 'none', border: 'none', color: 'rgba(255,255,255,0.8)', fontSize: 11, cursor: 'pointer', textAlign: 'left', borderRadius: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(77,159,255,0.12)')} onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                          {s.text}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button onClick={() => set('scenes', [...sheet.scenes, makeScene()])} style={{ fontSize: 9, color: accent, background: 'none', border: `1px dashed ${div}`, borderRadius: 4, padding: '3px 7px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}>
                  <Plus style={{ width: 10, height: 10 }} />Add
                </button>
              </div>
            </SH>
            {sheet.scenes.length === 0
              ? <p style={{ fontSize: 10, color: accent }}>No scenes yet — add manually or pull from script</p>
              : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr>{['Sc#','Int/Ext','Location','Description','Cast','Pgs','Est.',''].map(h => <th key={h} style={thS}>{h}</th>)}</tr></thead>
                  <tbody>
                    {sheet.scenes.map((r, i) => (
                      <tr key={r.id} style={{ background: i % 2 ? rowAlt : 'transparent' }}>
                        <td style={{ ...tdS, fontWeight: 700, width: 32 }}><input value={r.sceneNo} onChange={e => updateScene(r.id, { sceneNo: e.target.value })} style={{ background: 'transparent', border: 'none', outline: 'none', width: 28, color: pt, fontSize: 10, fontWeight: 700 }} /></td>
                        <td style={{ ...tdS, width: 52 }}><select value={r.intExt} onChange={e => updateScene(r.id, { intExt: e.target.value })} style={{ background: 'transparent', border: 'none', outline: 'none', color: pt, fontSize: 10, cursor: 'pointer' }}><option>INT</option><option>EXT</option><option>INT/EXT</option></select></td>
                        {(['location','description','cast','pages','estimatedTime'] as (keyof SceneRow)[]).map(f => (
                          <td key={f} style={tdS}><input value={r[f] as string} onChange={e => updateScene(r.id, { [f]: e.target.value })} style={{ background: 'transparent', border: 'none', outline: 'none', width: '100%', color: pt, fontSize: 10, fontFamily: (f==='pages'||f==='estimatedTime') ? 'monospace' : 'inherit' }} /></td>
                        ))}
                        <td style={{ ...tdS, width: 18 }}><button onClick={() => set('scenes', sheet.scenes.filter(s => s.id !== r.id))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: accent, padding: 0 }}><X style={{ width: 10, height: 10 }} /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
          </div>
        );
        break;

      case 'talent':
        content = (
          <div style={{ marginBottom: 20 }}>
            <SH text="🎭 Talent">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 9, color: accent }}>{selectedCast.length} Total</span>
                {manBtn}
              </div>
            </SH>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>{['Name','Character','Status','Pickup','Call','H/MU'].map(h => <th key={h} style={thS}>{h}</th>)}</tr></thead>
              <tbody>
                {selectedCast.length === 0
                  ? <tr><td colSpan={6} style={{ ...tdS, color: accent, textAlign: 'center', padding: '14px 8px' }}>No talent — use Cast &amp; Crew → On This Sheet</td></tr>
                  : selectedCast.map((p, i) => (
                    <tr key={p.id} style={{ background: i % 2 ? rowAlt : 'transparent' }}>
                      <td style={{ ...tdS, fontWeight: 700 }}>{p.name}</td>
                      <td style={{ ...tdS, color: accent }}>"{p.character||'—'}"</td>
                      <td style={{ ...tdS, color: accent }}>{p.status||'—'}</td>
                      <td style={{ ...tdS, fontFamily: 'monospace', color: accent }}>{p.pickup||'—'}</td>
                      <td style={{ ...tdS, fontWeight: 700, fontFamily: 'monospace' }}>{sheet.callTimeOverrides[p.id]||p.callTime||'—'}</td>
                      <td style={{ ...tdS, fontFamily: 'monospace', color: accent }}>{p.makeup||'—'}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        );
        break;

      case 'crew':
        content = (
          <div style={{ marginBottom: 20 }}>
            <SH text="🎬 Crew">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 9, color: accent }}>{selectedCrew.length} Total</span>
                {manBtn}
              </div>
            </SH>
            {selectedCrew.length === 0
              ? <p style={{ fontSize: 10, color: accent }}>No crew — use Cast &amp; Crew → On This Sheet</p>
              : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  {Object.entries(crewByDept).map(([dept, people]) => (
                    <div key={dept}>
                      <div style={{ background: deptBg, padding: '4px 8px', marginBottom: 0 }}>
                        <span style={{ fontSize: 9, fontWeight: 800, color: deptText, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{dept}</span>
                      </div>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead><tr><th style={thS}>Name</th><th style={{ ...thS, textAlign: 'right' }}>Call</th></tr></thead>
                        <tbody>
                          {people.map((p, i) => (
                            <tr key={p.id} style={{ background: i % 2 ? rowAlt : 'transparent' }}>
                              <td style={tdS}><div style={{ fontWeight: 700, fontSize: 11 }}>{p.name}</div><div style={{ fontSize: 9, color: accent }}>{p.role}</div></td>
                              <td style={{ ...tdS, textAlign: 'right', fontFamily: 'monospace', fontWeight: 700 }}>{sheet.callTimeOverrides[p.id]||p.callTime||'—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
              )}
          </div>
        );
        break;

      case 'locations':
        content = (
          <div style={{ marginBottom: 20 }}>
            <SH text="📍 Locations">
              <button onClick={() => set('locations', [...sheet.locations, makeLoc()])} style={{ fontSize: 9, color: accent, background: 'none', border: `1px dashed ${div}`, borderRadius: 4, padding: '3px 7px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}>
                <Plus style={{ width: 10, height: 10 }} />Add
              </button>
            </SH>
            {sheet.locations.length === 0
              ? <p style={{ fontSize: 10, color: accent }}>No locations yet</p>
              : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr><th style={{ ...thS, width: 20 }}>#</th><th style={thS}>📍 Set Location</th><th style={thS}>🅿 Parking</th><th style={{ ...thS, width: 14 }} /></tr></thead>
                  <tbody>
                    {sheet.locations.map((loc, i) => (
                      <tr key={loc.id} style={{ background: i % 2 ? rowAlt : 'transparent', verticalAlign: 'top' }}>
                        <td style={{ ...tdS, fontWeight: 700, color: accent }}>{i+1}</td>
                        <td style={tdS}>
                          {inp(loc.name, v => updateLoc(loc.id, {name:v}), {fontWeight:600}, 'Location name')}
                          {inp(loc.address, v => updateLoc(loc.id, {address:v}), {color:accent,fontSize:10}, 'Address')}
                          {inp(loc.phone, v => updateLoc(loc.id, {phone:v}), {color:accent,fontSize:10,fontFamily:'monospace'}, 'Phone')}
                          {inp(loc.notes, v => updateLoc(loc.id, {notes:v}), {color:accent,fontSize:10,fontStyle:'italic'}, 'Notes')}
                        </td>
                        <td style={tdS}>{inp(loc.parking, v => updateLoc(loc.id, {parking:v}), {fontWeight:600}, 'Parking location')}</td>
                        <td style={tdS}><button onClick={() => set('locations', sheet.locations.filter(l => l.id !== loc.id))} style={{ background:'none', border:'none', cursor:'pointer', color:accent, padding:0 }}><X style={{ width:10, height:10 }} /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
          </div>
        );
        break;

      case 'special':
        content = (
          <div style={{ marginBottom: 20 }}>
            <SH text="⚠ Special Instructions" />
            <textarea value={sheet.special} onChange={e => set('special', e.target.value)} placeholder="Safety briefings, protocols, special equipment…" style={{ background: 'transparent', border: `1px solid ${div}`, borderRadius: 3, color: pt, fontSize: 10, padding: 8, width: '100%', resize: 'none', minHeight: 60, outline: 'none', fontFamily: 'inherit' }} />
          </div>
        );
        break;

      case 'footer':
        content = (
          <div style={{ borderTop: `1px solid ${div}`, paddingTop: 10, marginTop: 10, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            {[['footerLeft','left',sheet.footerLeft],['footerCenter','center',sheet.footerCenter],['footerRight','right',sheet.footerRight]].map(([k,align,val]) => (
              <input key={k} value={val as string} onChange={e => set(k as keyof CallSheet, e.target.value as any)} placeholder={k==='footerLeft'?'CONFIDENTIAL':k==='footerCenter'?'Centre':'Page 1'} style={{ background:'transparent', border:'none', borderTop:`1px solid ${div}`, outline:'none', color:accent, fontSize:9, padding:'4px 2px', textAlign:align as any, width:'100%' }} />
            ))}
          </div>
        );
        break;

      default: return null;
    }

    return (
      <DragSection key={key} id={key} index={visibleSections.indexOf(key)} total={visibleSections.length} onMove={(from, to) => {
        const allOrder = [...sheet.sectionOrder];
        const fromKey = visibleSections[from];
        const toKey = visibleSections[to];
        const fi = allOrder.indexOf(fromKey), ti = allOrder.indexOf(toKey);
        if (fi >= 0 && ti >= 0) { const [m] = allOrder.splice(fi, 1); allOrder.splice(ti, 0, m); set('sectionOrder', allOrder); }
      }}>
        {content}
      </DragSection>
    );
  };

  return (
    <div style={{ background: pc, color: pt, width: '210mm', minHeight: '297mm', padding: '14mm 13mm', boxSizing: 'border-box', fontFamily: "'Helvetica Neue', Arial, sans-serif", boxShadow: '0 12px 60px rgba(0,0,0,0.55)', borderRadius: 2 }}>

      {/* ── TOP: 3-column header ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.1fr 1fr', gap: 14, marginBottom: 16, paddingBottom: 14, borderBottom: `2px solid ${pt}` }}>
        {/* Left */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <input value={sheet.headerProduction} onChange={e => set('headerProduction', e.target.value)} placeholder="Production name" style={{ background:'transparent', border:'none', outline:'none', fontSize:16, fontWeight:900, color:pt, width:'100%', letterSpacing:'-0.02em' }} />
          <input value={sheet.headerLocation} onChange={e => set('headerLocation', e.target.value)} placeholder="City, Country" style={{ background:'transparent', border:'none', outline:'none', fontSize:10, color:accent, width:'100%' }} />
          <input value={sheet.headerContact} onChange={e => set('headerContact', e.target.value)} placeholder="Contact info" style={{ background:'transparent', border:'none', outline:'none', fontSize:10, color:accent, width:'100%' }} />
        </div>

        {/* Centre: big call */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          <div style={{ fontSize: 9, fontWeight: 800, color: accent, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 2 }}>General Call Time</div>
          <input value={sheet.generalCall} onChange={e => set('generalCall', e.target.value)} placeholder="9:30am"
            style={{ background:'transparent', border:'none', outline:'none', fontSize:32, fontWeight:900, color:pt, textAlign:'center', width:'100%', letterSpacing:'-0.02em' }} />
        </div>

        {/* Right: day + schedule times */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: accent, marginBottom: 2 }}>DAY {sheet.shootDay} OF {sheet.totalDays}</div>
          <div style={{ fontSize: 14, fontWeight: 900, color: pt, marginBottom: 8 }}>{fmtDate(sheet.date)}</div>
          {[
            { label: 'Crew Call', val: sheet.generalCall, key: 'generalCall' as keyof CallSheet },
            ...(sheet.generalFieldToggles.shootingCall ? [{ label: 'Shooting Call', val: sheet.shootingCall, key: 'shootingCall' as keyof CallSheet }] : []),
            ...(sheet.generalFieldToggles.lunch ? [{ label: 'Lunch', val: sheet.lunch, key: 'lunch' as keyof CallSheet }] : []),
            ...(sheet.generalFieldToggles.estWrap ? [{ label: 'Est. Wrap', val: sheet.estWrap, key: 'estWrap' as keyof CallSheet }] : []),
          ].map(row => (
            <div key={row.key} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'2px 0', borderBottom:`1px solid ${div}` }}>
              <span style={{ fontSize:10, color:accent }}>{row.label}</span>
              <input value={row.val as string} onChange={e => set(row.key, e.target.value as any)} placeholder="—" style={{ background:'transparent', border:'none', outline:'none', fontSize:10, fontWeight:700, color:pt, textAlign:'right', width:70, fontFamily:'monospace' }} />
            </div>
          ))}
          {sheet.generalFieldToggles.weather && (
            <div style={{ marginTop: 6 }}>
              <div style={{ fontSize: 8, color: accent, textTransform: 'uppercase', letterSpacing: '0.09em' }}>Weather</div>
              <input value={sheet.weather} onChange={e => set('weather', e.target.value)} placeholder="e.g. Cloudy, 14°C" style={{ background:'transparent', border:'none', outline:'none', fontSize:10, color:pt, width:'100%' }} />
            </div>
          )}
        </div>
      </div>

      {/* ── Draggable sections ── */}
      {visibleSections.map((key, i) => renderSection(key, i))}

      {/* General Notes — always at bottom */}
      <div style={{ marginTop: 16, paddingTop: 10, borderTop: `1px solid ${div}` }}>
        <div style={{ fontSize: 9, fontWeight: 700, color: accent, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>General Notes</div>
        <textarea value={sheet.generalNotes} onChange={e => set('generalNotes', e.target.value)} placeholder="Walkie channels, dress code, parking, reminders…" style={{ background:'transparent', border:'none', color:accent, fontSize:10, width:'100%', resize:'none', minHeight:40, outline:'none', fontFamily:'inherit', lineHeight:1.6 }} />
      </div>
    </div>
  );
}

// ─── Call Sheets Panel ────────────────────────────────────────────────────────

function CallSheetsPanel({ project }: { project: Project }) {
  const { colors } = useTheme();
  const pc = colors.paper;
  const pt = needsWhiteText(pc) ? '#e8e8e8' : '#1a1a1a';

  const [sheets, setSheets] = useState<CallSheet[]>(() => loadSheets(project.id));
  const [roster, setRoster] = useState<ProjectRoster>(() => loadRoster(project.id));
  const [templates, setTemplates] = useState<CallSheetTemplate[]>(() => loadTemplates());
  const [activeId, setActiveId] = useState<string | null>(() => { const s = loadSheets(project.id); return s[0]?.id ?? null; });
  const [newOpen, setNewOpen] = useState(false);
  const [peopleOpen, setPeopleOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarW, setSidebarW] = useState(240);
  const [leftCollapsed, setLeftCollapsed] = useState(false);

  const persistSheets = useCallback((next: CallSheet[]) => { setSheets(next); saveSheets(project.id, next); }, [project.id]);
  const persistRoster = useCallback((next: ProjectRoster) => { setRoster(next); saveRoster(project.id, next); }, [project.id]);

  const handleCreate = (day: number, total: number, date: string) => {
    const s = makeSheet(day, date, project.name); s.totalDays = total;
    const next = [...sheets, s].sort((a, b) => a.shootDay - b.shootDay);
    persistSheets(next); setActiveId(s.id);
  };
  const handleDelete = (id: string) => { const next = sheets.filter(s => s.id !== id); persistSheets(next); if (activeId === id) setActiveId(next[0]?.id ?? null); };
  const handleChange = useCallback((id: string, patch: Partial<CallSheet>) => {
    persistSheets(sheets.map(s => s.id === id ? { ...s, ...patch } : s));
  }, [sheets, persistSheets]);

  const handleSaveTemplate = () => {
    const active = sheets.find(s => s.id === activeId);
    if (!active) return;
    const name = prompt('Template name:', active.name);
    if (!name) return;
    const t: CallSheetTemplate = { id: crypto.randomUUID(), name, sheet: { sections: active.sections, sectionOrder: active.sectionOrder, generalFieldToggles: active.generalFieldToggles, schedule: active.schedule, footerLeft: active.footerLeft, footerCenter: active.footerCenter, footerRight: active.footerRight } };
    const next = [...templates, t]; setTemplates(next); saveTemplates(next);
  };

  const handleLoadTemplate = (t: CallSheetTemplate) => {
    if (!activeId) return;
    handleChange(activeId, { ...t.sheet, schedule: (t.sheet.schedule || []).map(r => ({ ...r, id: crypto.randomUUID() })) });
  };

  const active = sheets.find(s => s.id === activeId) ?? null;
  const sorted = [...sheets].sort((a, b) => a.shootDay - b.shootDay);

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden', background: '#0f0f15' }}>
      {/* Day sidebar */}
      <div style={{ width: leftCollapsed ? 36 : 168, flexShrink: 0, borderRight: '1px solid rgba(255,255,255,0.08)', background: '#16161a', display: 'flex', flexDirection: 'column', transition: 'width 0.18s' }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '8px 8px', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
          {!leftCollapsed && <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', letterSpacing: '0.08em', flex: 1 }}>Shoot Days</span>}
          <button onClick={() => setLeftCollapsed(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', padding: 4, marginLeft: leftCollapsed ? 'auto' : 0 }}>
            {leftCollapsed ? <ChevronRight style={{ width: 14, height: 14 }} /> : <ChevronLeft style={{ width: 14, height: 14 }} />}
          </button>
        </div>
        {!leftCollapsed && (
          <>
            <div style={{ flex: 1, overflowY: 'auto' }} className="custom-scrollbar">
              {sorted.length === 0 && <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', padding: '12px 10px' }}>No call sheets yet</p>}
              {sorted.map(s => (
                <div key={s.id} onClick={() => setActiveId(s.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', cursor: 'pointer', borderLeft: `2px solid ${activeId === s.id ? '#4d9fff' : 'transparent'}`, background: activeId === s.id ? 'rgba(77,159,255,0.1)' : 'transparent' }}
                  onMouseEnter={e => { if (activeId !== s.id) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                  onMouseLeave={e => { if (activeId !== s.id) e.currentTarget.style.background = 'transparent'; }}>
                  <Calendar style={{ width: 12, height: 12, color: 'rgba(255,255,255,0.3)', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: activeId === s.id ? 'white' : 'rgba(255,255,255,0.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>{s.date}</div>
                  </div>
                  <button onClick={e => { e.stopPropagation(); handleDelete(s.id); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.15)', padding: 2 }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#f87171')} onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.15)')}>
                    <Trash2 style={{ width: 11, height: 11 }} />
                  </button>
                </div>
              ))}
            </div>
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', padding: 8 }}>
              <button onClick={() => setNewOpen(true)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '7px 0', borderRadius: 6, border: '1px dashed rgba(77,159,255,0.3)', background: 'rgba(77,159,255,0.06)', color: '#4d9fff', fontSize: 11, cursor: 'pointer' }}>
                <Plus style={{ width: 12, height: 12 }} />New day
              </button>
            </div>
          </>
        )}
      </div>

      {/* Sheet area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {active ? (
          <>
            {/* Toolbar */}
            <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12, padding: '6px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)', background: '#1a1a22' }}>
              <Clapperboard style={{ width: 14, height: 14, color: 'rgba(255,255,255,0.3)' }} />
              <input value={active.name} onChange={e => handleChange(active.id, { name: e.target.value })} style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.85)', width: 140 }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>
                <Calendar style={{ width: 12, height: 12 }} />
                <input type="date" value={active.date} onChange={e => handleChange(active.id, { date: e.target.value })} style={{ background: 'transparent', border: 'none', outline: 'none', color: 'rgba(255,255,255,0.5)', fontSize: 11, colorScheme: 'dark' } as any} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>
                <Clock style={{ width: 12, height: 12 }} /><span>Day {active.shootDay} of {active.totalDays}</span>
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
                <button onClick={() => exportCallSheetPDF(active, roster)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 6, background: 'rgba(77,159,255,0.12)', border: '1px solid rgba(77,159,255,0.3)', color: '#4d9fff', fontSize: 11, cursor: 'pointer' }}>
                  <Download style={{ width: 12, height: 12 }} />Export PDF
                </button>
                <button onClick={() => setPeopleOpen(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 6, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', fontSize: 11, cursor: 'pointer' }}>
                  <Users style={{ width: 12, height: 12 }} />Cast &amp; Crew
                  {(active.selectedCrew.length + active.selectedCast.length) > 0 && (
                    <span style={{ background: '#4d9fff', color: 'white', borderRadius: 10, fontSize: 10, padding: '1px 6px', fontWeight: 700 }}>{active.selectedCrew.length + active.selectedCast.length}</span>
                  )}
                </button>
              </div>
            </div>

            {/* A4 + sidebar */}
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
              <div style={{ flex: 1, overflowY: 'auto', padding: '28px 20px', display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }} className="custom-scrollbar">
                <A4Sheet sheet={active} onChange={p => handleChange(active.id, p)} roster={roster} pc={pc} pt={pt} onPeople={() => setPeopleOpen(true)} project={project} />
              </div>
              <SettingsSidebar sheet={active} onChange={p => handleChange(active.id, p)} isOpen={sidebarOpen} onToggle={() => setSidebarOpen(v => !v)} width={sidebarW} onWidthChange={setSidebarW} templates={templates} onSaveTemplate={handleSaveTemplate} onLoadTemplate={handleLoadTemplate} />
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, color: 'rgba(255,255,255,0.2)' }}>
            <Clapperboard style={{ width: 40, height: 40, opacity: 0.3 }} />
            <p style={{ fontSize: 13 }}>No call sheet selected</p>
            <button onClick={() => setNewOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 18px', borderRadius: 8, background: 'rgba(77,159,255,0.1)', border: '1px solid rgba(77,159,255,0.3)', color: '#4d9fff', fontSize: 12, cursor: 'pointer' }}>
              <Plus style={{ width: 14, height: 14 }} />Create first call sheet
            </button>
          </div>
        )}
      </div>

      <NewSheetDialog open={newOpen} onClose={() => setNewOpen(false)} onCreate={handleCreate} nextDay={sheets.length + 1} />
      {active && (
        <PersonModal open={peopleOpen} onClose={() => setPeopleOpen(false)} roster={roster} onRosterChange={persistRoster} sheet={active} onSheetChange={p => handleChange(active.id, p)} />
      )}
    </div>
  );
}

// ─── DocumentsTab ─────────────────────────────────────────────────────────────

export function DocumentsTab({ project }: { project: Project | null }) {
  const [subTab, setSubTab] = useState<'callsheets' | 'research'>('callsheets');
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#0f0f15', overflow: 'hidden' }}>
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4, padding: '5px 12px', borderBottom: '1px solid rgba(255,255,255,0.08)', background: '#16161a' }}>
        {([['callsheets', FileStack, 'Call Sheets'], ['research', FlaskConical, 'Research']] as const).map(([id, Icon, label]) => (
          <button key={id} onClick={() => setSubTab(id)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, background: subTab === id ? 'rgba(77,159,255,0.14)' : 'transparent', color: subTab === id ? '#4d9fff' : 'rgba(255,255,255,0.38)', transition: 'all 0.15s' }}>
            <Icon style={{ width: 14, height: 14 }} />{label}
          </button>
        ))}
      </div>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {subTab === 'research' && <ResearchBoard project={project} />}
        {subTab === 'callsheets' && (
          project ? <CallSheetsPanel project={project} />
            : <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, color: 'rgba(255,255,255,0.3)' }}>
              <FileStack style={{ width: 38, height: 38, opacity: 0.25 }} />
              <p style={{ fontSize: 13 }}>Open a project to manage call sheets</p>
            </div>
        )}
      </div>
    </div>
  );
}
