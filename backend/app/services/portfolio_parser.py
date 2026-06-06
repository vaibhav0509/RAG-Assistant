"""
Portfolio parser — extracts structured profile data from a PDF resume/CV.

Steps:
1. Extract full text via pdfplumber
2. Try to extract an embedded photo (returns base64 PNG if found)
3. Send text to LLM → get structured JSON profile
"""

import base64
import io
import json
import re
from pathlib import Path

import pdfplumber

from app.services.llm import llm_complete

EXTRACT_PROMPT = """You are a resume parser. Extract every piece of information from the resume text below and return ONLY valid JSON — no markdown, no explanation.

Return this exact structure (use empty string or empty array for missing fields):

{
  "name": "",
  "gender": "male|female|unknown",
  "title": "",
  "email": "",
  "phone": "",
  "location": "",
  "linkedin": "",
  "github": "",
  "website": "",
  "summary": "",
  "skills": ["skill1", "skill2"],
  "languages": ["language1"],
  "experience": [
    {
      "company": "",
      "role": "",
      "start": "",
      "end": "",
      "location": "",
      "bullets": ["bullet1", "bullet2"]
    }
  ],
  "education": [
    {
      "institution": "",
      "degree": "",
      "field": "",
      "start": "",
      "end": "",
      "grade": ""
    }
  ],
  "projects": [
    {
      "name": "",
      "description": "",
      "url": "",
      "tech": ["tech1"]
    }
  ],
  "certifications": ["cert1"],
  "links": ["url1"]
}

Rules:
- Collect ALL URLs/links mentioned anywhere in the resume into "links"
- Detect gender from the name (male/female/unknown)
- Keep bullets concise but complete
- For current positions use "end": "Present"

RESUME TEXT:
"""


async def parse_resume(file_bytes: bytes, filename: str) -> dict:
    """Return a structured profile dict extracted from the PDF."""
    text = _extract_text(file_bytes)
    photo_b64 = _extract_photo(file_bytes)

    messages = [
        {"role": "system", "content": "You are a precise resume parser. Return only valid JSON."},
        {"role": "user",   "content": EXTRACT_PROMPT + text[:6000]},
    ]

    raw = await llm_complete(messages)

    # Strip markdown code fences if model wraps output
    raw = re.sub(r"^```(?:json)?\s*", "", raw.strip(), flags=re.MULTILINE)
    raw = re.sub(r"\s*```$", "", raw.strip(), flags=re.MULTILINE)

    try:
        profile = json.loads(raw)
    except json.JSONDecodeError:
        # Try to find the JSON object inside the response
        m = re.search(r"\{.*\}", raw, re.DOTALL)
        profile = json.loads(m.group()) if m else {}

    profile["photo"] = photo_b64  # None if not found
    profile["source_filename"] = filename
    return profile


def _extract_text(file_bytes: bytes) -> str:
    text_parts = []
    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        for page in pdf.pages:
            t = page.extract_text()
            if t:
                text_parts.append(t)
    return "\n".join(text_parts)


def _extract_photo(file_bytes: bytes) -> str | None:
    """Try to extract the first embedded image from the PDF. Returns base64 data-URI or None."""
    try:
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            for page in pdf.pages:
                for img in page.images:
                    # pdfplumber gives us the raw image dict
                    raw = page.crop((img["x0"], img["top"], img["x1"], img["bottom"]))
                    pil = raw.to_image(resolution=150).original
                    buf = io.BytesIO()
                    pil.save(buf, format="PNG")
                    b64 = base64.b64encode(buf.getvalue()).decode()
                    # Only return reasonably-sized images (likely a photo, not a logo/icon)
                    if len(b64) > 5000:
                        return f"data:image/png;base64,{b64}"
    except Exception:
        pass
    return None
