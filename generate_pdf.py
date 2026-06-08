"""Convert UNDERSTANDING.md to a book-style PDF using WeasyPrint."""

import re
import sys
from pathlib import Path

try:
    from weasyprint import HTML, CSS
except ImportError:
    print("pip install weasyprint")
    sys.exit(1)

MD_PATH = Path(__file__).parent / "UNDERSTANDING.md"
PDF_PATH = Path(__file__).parent / "AI_Studio_Understanding.pdf"

md = MD_PATH.read_text()

# ── markdown → html (minimal parser, no deps) ──────────────────────────────

def md_to_html(text: str) -> str:
    lines = text.split("\n")
    out = []
    in_code = False
    in_table = False
    in_ul = False
    in_ol = False
    code_buf = []
    i = 0

    def close_list():
        nonlocal in_ul, in_ol
        if in_ul:
            out.append("</ul>")
            in_ul = False
        if in_ol:
            out.append("</ol>")
            in_ol = False

    def inline(s: str) -> str:
        # bold
        s = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', s)
        # italic
        s = re.sub(r'\*(.+?)\*', r'<em>\1</em>', s)
        # inline code
        s = re.sub(r'`(.+?)`', r'<code>\1</code>', s)
        # links
        s = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', r'<a href="\2">\1</a>', s)
        return s

    while i < len(lines):
        line = lines[i]

        # fenced code block
        if line.startswith("```"):
            if not in_code:
                close_list()
                lang = line[3:].strip()
                in_code = True
                code_buf = []
            else:
                code = "\n".join(code_buf)
                out.append(f'<pre><code>{code}</code></pre>')
                in_code = False
                code_buf = []
            i += 1
            continue

        if in_code:
            # escape html inside code blocks
            line = line.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
            code_buf.append(line)
            i += 1
            continue

        # horizontal rule
        if re.match(r'^---+$', line.strip()):
            close_list()
            out.append('<hr>')
            i += 1
            continue

        # table
        if '|' in line and line.strip().startswith('|'):
            if not in_table:
                close_list()
                in_table = True
                out.append('<table>')
                # header row
                cells = [c.strip() for c in line.strip().strip('|').split('|')]
                out.append('<thead><tr>' + ''.join(f'<th>{inline(c)}</th>' for c in cells) + '</tr></thead>')
                out.append('<tbody>')
                i += 1
                # skip separator row
                if i < len(lines) and re.match(r'^[\|\s\-:]+$', lines[i]):
                    i += 1
            else:
                cells = [c.strip() for c in line.strip().strip('|').split('|')]
                out.append('<tr>' + ''.join(f'<td>{inline(c)}</td>' for c in cells) + '</tr>')
                i += 1
            continue
        elif in_table:
            out.append('</tbody></table>')
            in_table = False

        # headings
        m = re.match(r'^(#{1,4})\s+(.*)', line)
        if m:
            close_list()
            level = len(m.group(1))
            text = inline(m.group(2))
            # add anchor id
            anchor = re.sub(r'[^\w\s-]', '', m.group(2).lower()).strip().replace(' ', '-')
            anchor = re.sub(r'-+', '-', anchor)
            out.append(f'<h{level} id="{anchor}">{text}</h{level}>')
            i += 1
            continue

        # unordered list
        m = re.match(r'^[-*]\s+(.*)', line)
        if m:
            if not in_ul:
                close_list()
                out.append('<ul>')
                in_ul = True
            out.append(f'<li>{inline(m.group(1))}</li>')
            i += 1
            continue

        # ordered list
        m = re.match(r'^\d+\.\s+(.*)', line)
        if m:
            if not in_ol:
                close_list()
                out.append('<ol>')
                in_ol = True
            out.append(f'<li>{inline(m.group(1))}</li>')
            i += 1
            continue

        # blank line
        if line.strip() == '':
            close_list()
            out.append('')
            i += 1
            continue

        # paragraph
        close_list()
        out.append(f'<p>{inline(line)}</p>')
        i += 1

    close_list()
    if in_table:
        out.append('</tbody></table>')

    return "\n".join(out)


body_html = md_to_html(md)

html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>AI Studio — Understanding the Full Project</title>
<style>
  /* ── Page setup ── */
  @page {{
    size: A4;
    margin: 22mm 20mm 25mm 24mm;
    @top-center {{
      content: "AI Studio — Full Project Guide";
      font-family: 'Georgia', serif;
      font-size: 8pt;
      color: #9ca3af;
      border-bottom: 0.5pt solid #e5e7eb;
      padding-bottom: 4pt;
    }}
    @bottom-center {{
      content: counter(page);
      font-family: 'Georgia', serif;
      font-size: 8pt;
      color: #9ca3af;
    }}
  }}

  @page :first {{
    margin-top: 0;
    @top-center {{ content: none; }}
    @bottom-center {{ content: none; }}
  }}

  /* ── Base typography ── */
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}

  body {{
    font-family: 'Georgia', 'Times New Roman', serif;
    font-size: 10.5pt;
    line-height: 1.75;
    color: #1f2937;
    background: #ffffff;
  }}

  /* ── Cover page ── */
  .cover {{
    height: 297mm;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    text-align: center;
    background: linear-gradient(160deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%);
    page-break-after: always;
    padding: 40mm 20mm;
  }}

  .cover-badge {{
    font-family: 'Courier New', monospace;
    font-size: 9pt;
    letter-spacing: 0.3em;
    color: #818cf8;
    text-transform: uppercase;
    margin-bottom: 16pt;
  }}

  .cover h1 {{
    font-family: 'Georgia', serif;
    font-size: 34pt;
    font-weight: bold;
    color: #f9fafb;
    line-height: 1.2;
    margin-bottom: 12pt;
  }}

  .cover h1 span {{
    color: #818cf8;
  }}

  .cover-subtitle {{
    font-size: 13pt;
    color: #9ca3af;
    line-height: 1.6;
    max-width: 340pt;
    margin-bottom: 40pt;
  }}

  .cover-divider {{
    width: 60pt;
    height: 2pt;
    background: #818cf8;
    margin: 0 auto 40pt;
  }}

  .cover-meta {{
    font-family: 'Courier New', monospace;
    font-size: 8pt;
    color: #6b7280;
    line-height: 2;
  }}

  .cover-meta strong {{
    color: #9ca3af;
  }}

  /* ── TOC page ── */
  .toc {{
    page-break-after: always;
    padding-top: 12pt;
  }}

  .toc h2 {{
    font-family: 'Georgia', serif;
    font-size: 22pt;
    color: #1f2937;
    margin-bottom: 24pt;
    padding-bottom: 8pt;
    border-bottom: 1.5pt solid #e5e7eb;
  }}

  .toc-section {{
    margin-bottom: 6pt;
  }}

  .toc-section a {{
    text-decoration: none;
    color: #374151;
    font-size: 10pt;
    display: flex;
    justify-content: space-between;
  }}

  .toc-section.level1 a {{
    font-weight: bold;
    color: #111827;
    font-size: 10.5pt;
    margin-top: 10pt;
  }}

  .toc-section.level2 a {{
    padding-left: 16pt;
    color: #4b5563;
  }}

  .toc-dot {{
    flex: 1;
    border-bottom: 1pt dotted #d1d5db;
    margin: 0 6pt;
    position: relative;
    top: -3pt;
  }}

  /* ── Chapter intro pages ── */
  .chapter-intro {{
    page-break-before: always;
    padding: 30pt 0 20pt;
    border-bottom: 2pt solid #e5e7eb;
    margin-bottom: 24pt;
  }}

  /* ── Headings ── */
  h1 {{
    font-family: 'Georgia', serif;
    font-size: 24pt;
    color: #111827;
    margin: 36pt 0 12pt;
    line-height: 1.25;
    page-break-after: avoid;
    border-bottom: 2pt solid #e5e7eb;
    padding-bottom: 8pt;
  }}

  h2 {{
    font-family: 'Georgia', serif;
    font-size: 16pt;
    color: #1e1b4b;
    margin: 28pt 0 8pt;
    line-height: 1.3;
    page-break-after: avoid;
  }}

  h3 {{
    font-family: 'Georgia', serif;
    font-size: 12.5pt;
    color: #312e81;
    margin: 20pt 0 6pt;
    page-break-after: avoid;
    font-style: italic;
  }}

  h4 {{
    font-family: 'Georgia', serif;
    font-size: 11pt;
    color: #4338ca;
    margin: 14pt 0 4pt;
    page-break-after: avoid;
  }}

  /* ── Paragraphs ── */
  p {{
    margin: 0 0 10pt;
    text-align: justify;
    hyphens: auto;
  }}

  /* ── Lists ── */
  ul, ol {{
    margin: 6pt 0 12pt 20pt;
  }}

  li {{
    margin-bottom: 5pt;
    line-height: 1.65;
  }}

  /* ── Code ── */
  code {{
    font-family: 'Courier New', monospace;
    font-size: 8.5pt;
    background: #f3f4f6;
    color: #374151;
    padding: 1pt 4pt;
    border-radius: 3pt;
    border: 0.5pt solid #e5e7eb;
  }}

  pre {{
    background: #0f172a;
    color: #e2e8f0;
    border-radius: 6pt;
    padding: 12pt 14pt;
    margin: 10pt 0 14pt;
    overflow: hidden;
    page-break-inside: avoid;
    border-left: 3pt solid #4f46e5;
  }}

  pre code {{
    background: none;
    color: #e2e8f0;
    border: none;
    padding: 0;
    font-size: 8pt;
    line-height: 1.6;
  }}

  /* ── Tables ── */
  table {{
    width: 100%;
    border-collapse: collapse;
    margin: 12pt 0 16pt;
    font-size: 9.5pt;
    page-break-inside: avoid;
  }}

  thead {{
    background: #1e1b4b;
    color: #f9fafb;
  }}

  th {{
    padding: 7pt 10pt;
    text-align: left;
    font-family: 'Georgia', serif;
    font-weight: bold;
    font-size: 9pt;
    letter-spacing: 0.02em;
  }}

  td {{
    padding: 6pt 10pt;
    border-bottom: 0.5pt solid #e5e7eb;
    vertical-align: top;
    line-height: 1.5;
  }}

  tr:nth-child(even) td {{
    background: #f9fafb;
  }}

  tr:last-child td {{
    border-bottom: 1pt solid #d1d5db;
  }}

  /* ── Horizontal rule ── */
  hr {{
    border: none;
    border-top: 1pt solid #e5e7eb;
    margin: 20pt 0;
  }}

  /* ── Callout box for "Things Worth Memorizing" ── */
  .callout {{
    background: #faf5ff;
    border-left: 4pt solid #7c3aed;
    padding: 10pt 14pt;
    margin: 12pt 0 16pt;
    border-radius: 0 4pt 4pt 0;
    page-break-inside: avoid;
  }}

  /* ── Strong / em ── */
  strong {{ color: #111827; }}
  em {{ color: #374151; }}

  a {{ color: #4338ca; }}

  /* ── Section numbers (decorative) ── */
  .section-number {{
    font-family: 'Courier New', monospace;
    font-size: 8pt;
    color: #818cf8;
    letter-spacing: 0.2em;
    display: block;
    margin-bottom: 4pt;
  }}
</style>
</head>
<body>

<!-- ══ COVER ══════════════════════════════════════════════════════════ -->
<div class="cover">
  <p class="cover-badge">Technical Deep-Dive</p>
  <h1>AI Studio<br/><span>Understanding the Full Project</span></h1>
  <p class="cover-subtitle">
    A plain-English guide to every tool, concept, and engineering
    decision in the AI Studio codebase — from embeddings to
    multi-agent orchestration.
  </p>
  <div class="cover-divider"></div>
  <div style="margin-bottom: 32pt;">
    <p style="font-family: Georgia, serif; font-size: 18pt; color: #e0e7ff; font-weight: bold; letter-spacing: 0.02em;">Vaibhav Mishra</p>
    <p style="font-family: Courier New, monospace; font-size: 8pt; color: #6366f1; letter-spacing: 0.15em; margin-top: 4pt;">FRONTEND DEV · BUILDING WITH AI</p>
  </div>
  <div class="cover-meta">
    <strong>Stack</strong> &nbsp;FastAPI · React 18 · ChromaDB · sentence-transformers<br/>
    <strong>LLM</strong> &nbsp;&nbsp;&nbsp;Ollama (local) · Groq (cloud)<br/>
    <strong>Tools</strong> &nbsp;&nbsp;10 panels · 4 retrieval strategies · 4 chunking strategies<br/>
    <strong>Tests</strong> &nbsp;&nbsp;39 pytest · SSE streaming throughout
  </div>
</div>

<!-- ══ TABLE OF CONTENTS ══════════════════════════════════════════════ -->
<div class="toc">
  <h2>Table of Contents</h2>

  <div class="toc-section level1"><a href="#the-big-picture"><span>The Big Picture</span><span class="toc-dot"></span></a></div>
  <div class="toc-section level2"><a href="#what-is-ai-studio"><span>What is AI Studio?</span><span class="toc-dot"></span></a></div>
  <div class="toc-section level2"><a href="#why-does-this-project-exist"><span>Why does this project exist?</span><span class="toc-dot"></span></a></div>
  <div class="toc-section level2"><a href="#how-does-the-backend-talk-to-the-frontend"><span>How does the backend talk to the frontend?</span><span class="toc-dot"></span></a></div>

  <div class="toc-section level1"><a href="#the-foundation-embeddings-and-vector-search"><span>The Foundation: Embeddings &amp; Vector Search</span><span class="toc-dot"></span></a></div>
  <div class="toc-section level2"><a href="#what-is-an-embedding"><span>What is an embedding?</span><span class="toc-dot"></span></a></div>
  <div class="toc-section level2"><a href="#what-is-chromadb"><span>What is ChromaDB?</span><span class="toc-dot"></span></a></div>

  <div class="toc-section level1"><a href="#tool-1-rag-chat"><span>Tool 1 — RAG Chat</span><span class="toc-dot"></span></a></div>
  <div class="toc-section level2"><a href="#what-is-rag"><span>What is RAG?</span><span class="toc-dot"></span></a></div>
  <div class="toc-section level2"><a href="#the-4-chunking-strategies"><span>The 4 Chunking Strategies</span><span class="toc-dot"></span></a></div>
  <div class="toc-section level2"><a href="#the-4-retrieval-strategies"><span>The 4 Retrieval Strategies</span><span class="toc-dot"></span></a></div>
  <div class="toc-section level2"><a href="#what-is-cross-encoder-re-ranking"><span>Cross-Encoder Re-ranking</span><span class="toc-dot"></span></a></div>

  <div class="toc-section level1"><a href="#tool-2-react-agent"><span>Tool 2 — ReAct Agent</span><span class="toc-dot"></span></a></div>
  <div class="toc-section level1"><a href="#tool-3-multi-agent-pipeline"><span>Tool 3 — Multi-Agent Pipeline</span><span class="toc-dot"></span></a></div>
  <div class="toc-section level1"><a href="#tool-4-agent-workflow-builder"><span>Tool 4 — Agent Workflow Builder</span><span class="toc-dot"></span></a></div>
  <div class="toc-section level1"><a href="#tool-5-visualize"><span>Tool 5 — Visualize</span><span class="toc-dot"></span></a></div>
  <div class="toc-section level1"><a href="#tool-6-rag-evaluation"><span>Tool 6 — RAG Evaluation</span><span class="toc-dot"></span></a></div>
  <div class="toc-section level1"><a href="#tool-7-quiz-game"><span>Tool 7 — Quiz Game</span><span class="toc-dot"></span></a></div>
  <div class="toc-section level1"><a href="#tool-8-cv--portfolio"><span>Tool 8 — CV → Portfolio</span><span class="toc-dot"></span></a></div>
  <div class="toc-section level1"><a href="#tool-9-blueprint"><span>Tool 9 — Blueprint</span><span class="toc-dot"></span></a></div>

  <div class="toc-section level1"><a href="#the-infrastructure"><span>The Infrastructure</span><span class="toc-dot"></span></a></div>
  <div class="toc-section level2"><a href="#sse-streaming--how-real-time-output-works"><span>SSE Streaming</span><span class="toc-dot"></span></a></div>
  <div class="toc-section level2"><a href="#processcontext--the-real-time-terminal-sidebar"><span>ProcessContext — Terminal Sidebar</span><span class="toc-dot"></span></a></div>
  <div class="toc-section level2"><a href="#rate-limiting"><span>Rate Limiting</span><span class="toc-dot"></span></a></div>

  <div class="toc-section level1"><a href="#how-the-frontend-is-structured"><span>How the Frontend is Structured</span><span class="toc-dot"></span></a></div>
  <div class="toc-section level1"><a href="#the-llm-layer"><span>The LLM Layer</span><span class="toc-dot"></span></a></div>

  <div class="toc-section level1"><a href="#common-questions-and-how-to-answer-them"><span>Common Questions &amp; How to Answer Them</span><span class="toc-dot"></span></a></div>
  <div class="toc-section level1"><a href="#mental-model-how-a-request-flows-end-to-end"><span>Mental Model: End-to-End Request Flow</span><span class="toc-dot"></span></a></div>
  <div class="toc-section level1"><a href="#things-worth-memorizing"><span>Things Worth Memorizing</span><span class="toc-dot"></span></a></div>
</div>

<!-- ══ BODY CONTENT ════════════════════════════════════════════════════ -->
{body_html}

</body>
</html>"""

print("Generating PDF…")
HTML(string=html).write_pdf(
    str(PDF_PATH),
    stylesheets=[],
)
print(f"Done → {PDF_PATH}")
