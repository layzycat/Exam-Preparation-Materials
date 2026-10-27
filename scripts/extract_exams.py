#!/usr/bin/env python3
import os
import re
import glob
import html
import json
import shutil
import unicodedata
import fitz

CHAPTER_TITLES = {
    1: "Chương 1 – Nền tảng kiểm thử (Fundamentals of Testing)",
    2: "Chương 2 – Kiểm thử trong vòng đời phát triển (Testing Throughout the SDLC)",
    3: "Chương 3 – Kiểm thử tĩnh (Static Testing)",
    4: "Chương 4 – Kỹ thuật kiểm thử (Test Analysis and Design)",
    5: "Chương 5 – Quản lý hoạt động kiểm thử (Managing the Test Activities)",
    6: "Chương 6 – Công cụ hỗ trợ kiểm thử (Test Tools)",
}

def clean_text(s: str) -> str:
    s = html.unescape(s)
    s = unicodedata.normalize("NFC", s)
    # Collapse multiple spaces/newlines into single space
    s = re.sub(r"\s+", " ", s).strip()
    return s

def main():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    pdf_dir = os.path.join(base_dir, "IETLS")
    img_out_dir = os.path.join(base_dir, "public", "images", "questions")
    pdf_out_dir = os.path.join(base_dir, "public", "pdfs")
    data_out_dir = os.path.join(base_dir, "src", "data")
    os.makedirs(img_out_dir, exist_ok=True)
    os.makedirs(pdf_out_dir, exist_ok=True)
    os.makedirs(data_out_dir, exist_ok=True)

    pdf_files = sorted(
        glob.glob(os.path.join(pdf_dir, "*.pdf")),
        key=lambda x: int(re.search(r"(\d+)\.pdf$", unicodedata.normalize("NFC", x)).group(1))
    )

    translations_path = os.path.join(data_out_dir, "translationsVi.json")
    translations_vi = {}
    if os.path.exists(translations_path):
        with open(translations_path, "r", encoding="utf-8") as f_tr:
            translations_vi = json.load(f_tr)

    exams = []
    all_questions = []
    total_images = 0

    for exam_num, pdf_path in enumerate(pdf_files, 1):
        doc = fitz.open(pdf_path)
        stream = []
        for pno, page in enumerate(doc):
            d = page.get_text("dict")
            blocks = sorted(d["blocks"], key=lambda b: (round(b["bbox"][1], 1), round(b["bbox"][0], 1)))
            for b in blocks:
                if b["type"] == 0:
                    for l in b["lines"]:
                        txt = "".join(s["text"] for s in l["spans"]).strip()
                        txt = unicodedata.normalize("NFC", txt)
                        if txt:
                            stream.append(("text", pno, txt))
                elif b["type"] == 1:
                    stream.append(("img", pno, b))

        raw_questions = []
        curr_q = None
        in_supp_intro = False

        for kind, pno, val in stream:
            if kind == "text":
                if re.match(r"^(GIẢI CHI TIẾT|ĐỀ\s+\d+|Author:)", val, re.I):
                    continue
                if re.match(r"^PHẦN BỔ SUNG", val, re.I):
                    if curr_q:
                        raw_questions.append(curr_q)
                        curr_q = None
                    in_supp_intro = True
                    continue

                m_q = re.match(r"^(Câu(?:\s+bổ\s+sung)?\s+\d+)\b(.*)$", val)
                if m_q and (curr_q is None or any(l.startswith("Đáp án:") for l in curr_q["lines"])):
                    if curr_q:
                        raw_questions.append(curr_q)
                    in_supp_intro = False
                    curr_q = {
                        "label": m_q.group(1).strip(),
                        "is_supp": "bổ sung" in m_q.group(1).lower(),
                        "lines": [m_q.group(2).strip()] if m_q.group(2).strip() else [],
                        "imgs": []
                    }
                    continue

                if in_supp_intro and curr_q is None:
                    continue

                if curr_q is not None:
                    curr_q["lines"].append(val)
            elif kind == "img":
                if curr_q is not None:
                    curr_q["imgs"].append((pno, val))

        if curr_q:
            raw_questions.append(curr_q)

        exam_questions = []
        seen_labels = set()

        for q_idx, rq in enumerate(raw_questions, 1):
            text = "\n".join(rq["lines"])
            m = re.search(
                r"^(.*?)\na\)\s*(.*?)\nb\)\s*(.*?)\nc\)\s*(.*?)\nd\)\s*(.*?)\nĐáp án:\s*([a-dA-D])\b\s*\nGiải thích:\s*(.*?)(?:\nKiến thức:\s*(.*))?$",
                text,
                re.S
            )
            if not m:
                raise ValueError(f"Failed to parse Exam {exam_num} {rq['label']}")

            stem, opt_a, opt_b, opt_c, opt_d, ans, expl, know = m.groups()
            know_clean = clean_text(know or "")
            ch_m = re.search(r"Chương\s*(\d+)", know_clean)
            chapter_num = int(ch_m.group(1)) if ch_m else 1
            is_v4 = rq["is_supp"] or ("v4.0" in know_clean.lower()) or ("v4.0" in stem.lower())

            label = rq["label"]
            if label in seen_labels and label == "Câu 23":
                display_label = "Câu 24"
            else:
                display_label = label
            seen_labels.add(label)

            image_urls = []
            for img_i, (pno, img_block) in enumerate(rq["imgs"], 1):
                ext = img_block.get("ext", "png")
                img_filename = f"exam-{exam_num}-q-{q_idx}-{img_i}.{ext}"
                img_path = os.path.join(img_out_dir, img_filename)
                with open(img_path, "wb") as f_img:
                    f_img.write(img_block["image"])
                image_urls.append(f"/images/questions/{img_filename}")
                total_images += 1

            q_id = f"e{exam_num}_q{q_idx}"
            tr = translations_vi.get(q_id, {})

            q_obj = {
                "id": q_id,
                "examId": exam_num,
                "examTitle": f"Đề {exam_num}",
                "order": q_idx,
                "label": display_label,
                "originalLabel": label,
                "isSupplementary": rq["is_supp"],
                "isV4": is_v4,
                "question": clean_text(stem),
                "questionVi": tr.get("questionVi", ""),
                "images": image_urls,
                "options": {
                    "a": clean_text(opt_a),
                    "b": clean_text(opt_b),
                    "c": clean_text(opt_c),
                    "d": clean_text(opt_d),
                },
                "optionsVi": tr.get("optionsVi", {}),
                "correctAnswer": ans.lower().strip(),
                "explanation": clean_text(expl),
                "knowledge": know_clean,
                "chapter": chapter_num,
                "chapterTitle": CHAPTER_TITLES.get(chapter_num, f"Chương {chapter_num}"),
            }
            exam_questions.append(q_obj)
            all_questions.append(q_obj)

        pdf_dest = os.path.join(pdf_out_dir, f"de-{exam_num}.pdf")
        shutil.copy2(pdf_path, pdf_dest)

        exams.append({
            "id": exam_num,
            "title": f"Đề thi thử ISTQB CTFL – Đề {exam_num}",
            "shortTitle": f"Đề {exam_num}",
            "pdfFileName": unicodedata.normalize("NFC", os.path.basename(pdf_path)),
            "pdfUrl": f"/pdfs/de-{exam_num}.pdf",
            "questionCount": len(exam_questions),
            "regularCount": sum(1 for q in exam_questions if not q["isSupplementary"]),
            "supplementaryCount": sum(1 for q in exam_questions if q["isSupplementary"]),
            "imageCount": sum(len(q["images"]) for q in exam_questions),
            "questions": exam_questions,
        })

    payload = {
        "metadata": {
            "title": "Hệ thống Luyện thi ISTQB Foundation Level (CTFL v4.0)",
            "author": "Nhựt Võ (istqbbaodau.com)",
            "totalExams": len(exams),
            "totalQuestions": len(all_questions),
            "totalImages": total_images,
            "standardQuestionCount": 40,
            "passPercentage": 65,
            "passScoreOn40": 26,
            "durationsMinutes": [60, 75, 90],
            "chapters": [
                {
                    "chapter": ch_num,
                    "title": ch_title,
                    "questionCount": sum(1 for q in all_questions if q["chapter"] == ch_num),
                }
                for ch_num, ch_title in CHAPTER_TITLES.items()
            ],
        },
        "exams": exams,
    }

    out_file = os.path.join(data_out_dir, "examsData.json")
    with open(out_file, "w", encoding="utf-8") as f_out:
        json.dump(payload, f_out, ensure_ascii=False, indent=2)

    print(f"Successfully extracted {len(exams)} exams, {len(all_questions)} questions, {total_images} images to {out_file}")

if __name__ == "__main__":
    main()
