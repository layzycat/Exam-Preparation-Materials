import React, { useState, useMemo } from 'react';
import { Search, BookMarked } from 'lucide-react';
import { ISTQB_GLOSSARY } from '../data/istqbGlossary';
import { CHAPTER_SHORT_NAMES } from '../utils/quizHelper';

export const GlossaryView: React.FC = () => {
  const [query, setQuery] = useState('');
  const [chapterFilter, setChapterFilter] = useState<number | 'all'>('all');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ISTQB_GLOSSARY.filter((item) => {
      if (chapterFilter !== 'all' && item.chapter !== chapterFilter) return false;
      if (q) {
        const hay = `${item.termEn} ${item.termVi} ${item.definition}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [query, chapterFilter]);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <BookMarked className="w-5 h-5 text-indigo-600" />
              <span>Từ Điển Thuật Ngữ Chuyên Ngành ISTQB CTFL (Anh – Việt)</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Hệ thống thuật ngữ chuẩn dùng để dịch câu hỏi và đối chiếu khi làm bài thi quốc tế
            </p>
          </div>

          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm thuật ngữ (VD: defect, coverage, oracle...)"
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setChapterFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              chapterFilter === 'all'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Tất cả ({ISTQB_GLOSSARY.length})
          </button>
          {[1, 2, 3, 4, 5, 6].map((ch) => (
            <button
              key={ch}
              type="button"
              onClick={() => setChapterFilter(ch)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                chapterFilter === ch
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {CHAPTER_SHORT_NAMES[ch]}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((item, idx) => (
          <div
            key={idx}
            className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-2.5"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-base font-bold text-indigo-700">{item.termEn}</div>
                <div className="text-sm font-bold text-slate-900 mt-0.5">{item.termVi}</div>
              </div>
              <span className="px-2.5 py-0.5 rounded-md bg-sky-50 text-sky-700 border border-sky-200 text-xs font-semibold shrink-0">
                Chương {item.chapter}
              </span>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">{item.definition}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

