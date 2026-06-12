import { useEffect, useRef, useState } from 'react';
import { Bold, Italic, List, ListOrdered, Link2, Heading, Image as ImageIcon, Code } from 'lucide-react';
import { uploadFile } from '../api';

// Allow-list sanitiser. Content is staff-authored, so we permit inline styles /
// classes for custom design, images and code blocks — but always strip scripts,
// embeds, event handlers and javascript: URLs.
const ALLOWED_TAGS = new Set([
  'B', 'STRONG', 'I', 'EM', 'U', 'S', 'P', 'BR', 'HR', 'UL', 'OL', 'LI', 'A',
  'H2', 'H3', 'H4', 'DIV', 'SPAN', 'IMG', 'PRE', 'CODE', 'BLOCKQUOTE',
  'TABLE', 'THEAD', 'TBODY', 'TFOOT', 'TR', 'TD', 'TH', 'FIGURE', 'FIGCAPTION',
]);
const KEEP_ATTRS = new Set(['href', 'src', 'alt', 'width', 'height', 'style', 'class', 'colspan', 'rowspan', 'target', 'rel']);
const BAD = /javascript:|expression\(|<script|on\w+\s*=/i;

export function sanitizeHtml(html: string): string {
  if (!html) return '';
  const doc = new DOMParser().parseFromString(html, 'text/html');
  // remove dangerous elements entirely
  doc.querySelectorAll('script, iframe, object, embed, link, meta, style').forEach((el) => el.remove());
  const walk = (node: Element) => {
    [...node.children].forEach((el) => {
      if (!ALLOWED_TAGS.has(el.tagName)) { el.replaceWith(...Array.from(el.childNodes)); return; }
      [...el.attributes].forEach((a) => {
        const name = a.name.toLowerCase();
        const val = (a.value || '').trim();
        if (name.startsWith('on') || !KEEP_ATTRS.has(name)) { el.removeAttribute(a.name); return; }
        if (BAD.test(val)) { el.removeAttribute(a.name); return; }
        if (el.tagName === 'A' && name === 'href') { el.setAttribute('target', '_blank'); el.setAttribute('rel', 'noreferrer'); }
      });
      walk(el);
    });
  };
  walk(doc.body);
  return doc.body.innerHTML;
}

const isEmptyHtml = (html: string) => sanitizeHtml(html).replace(/<br\s*\/?>(?=$)/i, '').replace(/<[^>]+>/g, '').trim() === '' && !/<img/i.test(html);

export function RichText({ value, onChange, placeholder, minHeight = 96 }: {
  value: string; onChange: (html: string) => void; placeholder?: string; minHeight?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [source, setSource] = useState(false);

  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== (value || '')) ref.current.innerHTML = value || '';
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const emit = () => onChange(ref.current ? sanitizeHtml(ref.current.innerHTML) : '');
  const cmd = (command: string, arg?: string) => { document.execCommand(command, false, arg); ref.current?.focus(); emit(); };
  const addLink = () => { const url = prompt('Link URL'); if (url) cmd('createLink', url); };
  const insertImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    const url = await uploadFile(f);
    const src = url.startsWith('http') ? url : url; // served path
    cmd('insertHTML', `<img src="${src}" alt="" style="max-width:100%;border-radius:12px" />`);
  };

  const toggleSource = () => {
    if (source) { if (ref.current) ref.current.innerHTML = value || ''; } // back to rich
    setSource((s) => !s);
  };

  return (
    <div className="rounded-2xl border border-black/10 overflow-hidden bg-white">
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-black/[0.06] bg-black/[0.02]">
        <TbBtn onClick={() => cmd('bold')} disabled={source}><Bold size={15} /></TbBtn>
        <TbBtn onClick={() => cmd('italic')} disabled={source}><Italic size={15} /></TbBtn>
        <TbBtn onClick={() => cmd('underline')} disabled={source}><span className="underline text-[13px] font-bold leading-none">U</span></TbBtn>
        <span className="w-px h-5 bg-black/10 mx-1" />
        <TbBtn onClick={() => cmd('formatBlock', 'H3')} disabled={source}><Heading size={15} /></TbBtn>
        <TbBtn onClick={() => cmd('insertUnorderedList')} disabled={source}><List size={15} /></TbBtn>
        <TbBtn onClick={() => cmd('insertOrderedList')} disabled={source}><ListOrdered size={15} /></TbBtn>
        <TbBtn onClick={addLink} disabled={source}><Link2 size={15} /></TbBtn>
        <TbBtn onClick={() => fileRef.current?.click()} disabled={source}><ImageIcon size={15} /></TbBtn>
        <span className="flex-1" />
        <button type="button" onClick={toggleSource} title="Edit HTML / code"
          className={`px-2 h-8 rounded-lg flex items-center gap-1 text-xs font-bold ${source ? 'bg-navy text-white' : 'text-navy hover:bg-black/[0.06]'}`}>
          <Code size={14} /> {source ? 'Done' : 'HTML'}
        </button>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={insertImage} />
      </div>

      {source ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} spellCheck={false}
          className="w-full px-3 py-2.5 text-[13px] font-mono text-navy outline-none resize-y" style={{ minHeight }}
          placeholder="<div style='...'>Custom HTML & CSS…</div>" />
      ) : (
        <div className="relative">
          {isEmptyHtml(value || '') && placeholder && <span className="absolute left-3 top-2.5 text-sub text-[15px] pointer-events-none">{placeholder}</span>}
          <div ref={ref} contentEditable suppressContentEditableWarning onInput={emit} onBlur={emit}
            className="rich-content px-3 py-2.5 text-[15px] text-navy outline-none" style={{ minHeight }} />
        </div>
      )}
    </div>
  );
}

function TbBtn({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return <button type="button" disabled={disabled} onMouseDown={(e) => e.preventDefault()} onClick={onClick}
    className="w-8 h-8 rounded-lg flex items-center justify-center text-navy hover:bg-black/[0.06] disabled:opacity-30">{children}</button>;
}

// Render stored rich text safely. Resolves relative upload paths to the API host.
const API_HOST = 'https://teli-api.onrender.com';
export function RichTextView({ html, className = '' }: { html: string; className?: string }) {
  if (!html) return null;
  const resolved = sanitizeHtml(html).replace(/src="(\/uploads\/[^"]+)"/g, `src="${API_HOST}$1"`);
  return <div className={`rich-content ${className}`} dangerouslySetInnerHTML={{ __html: resolved }} />;
}
