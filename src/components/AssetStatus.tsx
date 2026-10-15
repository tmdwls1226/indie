import { assetExists, useAssets } from '../assets/assets';
import { expectedAssets, type Priority } from '../assets/expected';

const PRIORITIES: Priority[] = ['P0', 'P1', 'P2'];
/** Which expected image files are present (image guide priorities), and which are still emoji / glyph placeholders. */
export default function AssetStatus() {
  useAssets();
  const all = expectedAssets().map(a => ({ ...a, have: assetExists(a.stem) }));
  const groups = [...new Set(all.map(a => a.group))];
  const missing = all.filter(a => !a.have).sort((a, b) => a.priority.localeCompare(b.priority));
  return <details className="debug-box asset-status"><summary>에셋 현황 · {all.filter(a => a.have).length}/{all.length} 적용</summary>
    <div className="asset-rows">{PRIORITIES.map(p => { const rows = all.filter(a => a.priority === p); return <div key={p} className="asset-row"><b>{p}</b><span>{rows.filter(r => r.have).length} / {rows.length}</span></div>; })}</div>
    <div className="asset-rows">{groups.map(g => { const rows = all.filter(a => a.group === g); return <div key={g} className="asset-row"><span>{g}</span><span>{rows.filter(r => r.have).length} / {rows.length}</span></div>; })}</div>
    <details><summary>없는 파일 {missing.length}개 (우선순위 순)</summary>
      <div className="asset-missing">{missing.slice(0, 80).map(m => <div key={m.stem}><b>{m.priority}</b> public/assets/{m.stem}.png</div>)}{missing.length > 80 && <div>… 외 {missing.length - 80}개</div>}</div></details>
  </details>;
}
