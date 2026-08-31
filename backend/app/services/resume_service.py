import os
import json


async def parse_resume(file_path: str, ext: str) -> dict:
    """解析简历文件，返回纯文本和结构化数据"""
    content_text = ""
    try:
        if ext == "pdf":
            import pdfplumber
            with pdfplumber.open(file_path) as pdf:
                content_text = "\n".join([page.extract_text() or "" for page in pdf.pages])
        elif ext in ("docx", "doc"):
            from docx import Document
            doc = Document(file_path)
            content_text = "\n".join([p.text for p in doc.paragraphs])
        elif ext == "txt":
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                content_text = f.read()
    except Exception as e:
        content_text = f"[解析失败: {str(e)}]"

    # 简单结构化提取（MVP 版本，后续可用 LLM 增强）
    parsed_data = {
        "raw_text_length": len(content_text),
        "education": _extract_section(content_text, ["教育", "学历", "education"]),
        "experience": _extract_section(content_text, ["工作", "实习", "experience", "work"]),
        "projects": _extract_section(content_text, ["项目", "project"]),
        "skills": _extract_section(content_text, ["技能", "skill", "技术栈"]),
    }

    return {"content_text": content_text[:5000], "parsed_data": parsed_data}


def _extract_section(text: str, keywords: list) -> list:
    """简单的章节提取"""
    lines = text.split("\n")
    sections = []
    current = []
    in_section = False
    for line in lines:
        if any(kw in line.lower() for kw in keywords) and len(line) < 30:
            if current:
                sections.append("\n".join(current))
                current = []
            in_section = True
            continue
        if in_section:
            if line.strip() and not any(kw in line.lower() for kw in ["教育", "工作", "项目", "技能", "education", "experience", "project", "skill"]):
                current.append(line.strip())
            else:
                if current:
                    sections.append("\n".join(current))
                    current = []
                in_section = False
    if current:
        sections.append("\n".join(current))
    return sections[:5]
