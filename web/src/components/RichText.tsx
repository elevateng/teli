import { useEffect, useRef } from 'react';
import { Bold, Italic, List, ListOrdered, Link2, Heading } from 'lucide-react';

// Very small allow-list sanitiser. Content is admin-authored, but we still strip
// scripts / event handlers / javascript: URLs before storing or rendering.
export function sanitizeHtml(html: string): string {
  if (!html) return '';
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const allowed = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'P', 'BR', 'UL', 'OL', 'LI', 'A', 'H3', 'H4', 'DIV', 'SPAN']);
  const walk = (node: Element) => {
    [...node.children].forEach((el) => {
      if (!allowed.has(el.tagName)) {
        // unwrap disallowed element, keep its text
        el.replaceWith(...Array.from(el.childNodes));
        return;
      }
      [...el.attributes].forEach((a) => {
        const name = a.name.toLowerCase();
        const val = a.value.trim();
        if (el.tagName === 'A' && name === 'href') {
          if (/^\s*javascript:/i.test(val)) el.removeAttribute('href');
          else { el.setAttribute('target', '_blank'); el.setAttribute('rel', 'noreferrer'); }
        } else if (name !== 'href') {
          el.removeAttribute(a.name); // drop style, on*, class, etc.
        }
      });
      walk(el);
    });
  };
  walk(doc.body);
  return doc.body.innerHTML;
}

const isEmptyHtml = (html: string) => sanitizeHtml(html).replace(/<br\s*\/?>(?=$)/i, '').replace(/<[^>]+>/g, '').trim() === '';

export function RichText({ value, onChange, placeholder, minHeight = 96 }: {
  value: string; onChange: (html: string) => void; placeholder?: string; minHeight?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // set initial content once (avoid clobbering the cursor on every keystroke)
  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== (value || '')) ref.current.innerHTML = value || '';
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const emit = () => onChange(ref.current ? sanitizeHtml(ref.current.innerHTML) : '');
  const cmd = (command: string, arg?: string) => { document.execCommand(command, false, arg); ref.current?.focus(); emit(); };
  const addLink = () => { const url = prompt('Link URL'); if (url) cmd('createLink', url); };

  const empty = isEmptyHtml(value || '');

  return (
    <div className="rounded-2xl border border-black/10 overflow-hidden bg-white">
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-black/[0.06] bg-black/[0.02]">
        <TbBtn onClick={() => cmd('bold')}><Bold size={15} /></TbBtn>
        <TbBtn onClick={() => cmd('italic')}><Italic size={15} /></TbBtn>
        <TbBtn onClick={() => cmd('underline')}><span className="underline text-[13px] font-bold leading-none">U</span></TbBtn>
        <span className="w-px h-5 bg-black/10 mx-1" />
        <TbBtn onClick={() => cmd('formatBlock', 'H3')}><Heading size={15} /></TbBtn>
        <TbBtn onClick={() => cmd('insertUnorderedList')}><List size={15} /></TbBtn>
        <TbBtn onClick={() => cmd('insertOrderedList')}><ListOrdered size={15} /></TbBtn>
        <TbBtn onClick={addLink}><Link2 size={15} /></TbBtn>
      </div>
      <div className="relative">
        {empty && placeholder && <span className="absolute left-3 top-2.5 text-sub text-[15px] pointer-events-none">{placeholder}</span>}
        <div ref={ref} contentEditable suppressContentEditableWarning onInput={emit} onBlur={emit}
          className="rich-content px-3 py-2.5 text-[15px] text-navy outline-none" style={{ minHeight }} />
      </div>
    </div>
  );
}

function TbBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={onClick}
    className="w-8 h-8 rounded-lg flex items-center justify-center text-navy hover:bg-black/[0.06]">{children}</button>;
}

// Render stored rich text safely.
export function RichTextView({ html, className = '' }: { html: string; className?: string }) {
  if (!html) return null;
  return <div className={`rich-content ${className}`} dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }} />;
}
