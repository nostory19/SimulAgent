'use client';

/**
 * 通用分页组件
 * 匹配 SimulAgent 设计系统：灰色基调、圆角卡片、绿色点缀
 */

interface PaginationProps {
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

/** 生成页码数组，含省略号标记 */
function getPageNumbers(current: number, totalPages: number): (number | '...')[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages: (number | '...')[] = [1];

  if (current > 3) {
    pages.push('...');
  }

  const start = Math.max(2, current - 1);
  const end = Math.min(totalPages - 1, current + 1);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (current < totalPages - 2) {
    pages.push('...');
  }

  if (totalPages > 1) {
    pages.push(totalPages);
  }

  return pages;
}

export default function Pagination({ total, page, pageSize, onPageChange }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  if (total <= pageSize) return null;

  const pages = getPageNumbers(page, totalPages);
  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, total);

  return (
    <div className="flex items-center justify-between gap-4 pt-4 pb-2 animate-enter">
      {/* 左侧：条数信息 */}
      <p className="text-[11px] text-gray-300 whitespace-nowrap">
        共 <span className="text-gray-500 font-medium">{total}</span> 条
        <span className="mx-1.5 text-gray-200">·</span>
        {startItem}-{endItem} 条
      </p>

      {/* 右侧：翻页控件 */}
      <div className="flex items-center gap-1">
        {/* 上一页 */}
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="flex items-center gap-1 px-2.5 py-1.5 text-[12px] font-medium rounded-lg
            text-gray-400 hover:text-gray-600 hover:bg-gray-50
            disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-gray-400
            transition-all duration-200"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          上一页
        </button>

        {/* 页码 */}
        <div className="flex items-center gap-0.5 mx-1">
          {pages.map((p, i) =>
            p === '...' ? (
              <span key={`ellipsis-${i}`} className="w-7 text-center text-[11px] text-gray-300 select-none">
                ···
              </span>
            ) : (
              <button
                key={p}
                onClick={() => onPageChange(p)}
                className={`w-7 h-7 flex items-center justify-center text-[12px] font-medium rounded-lg
                  transition-all duration-200 ${
                    p === page
                      ? 'bg-gray-800 text-white shadow-sm'
                      : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                  }`}
              >
                {p}
              </button>
            )
          )}
        </div>

        {/* 下一页 */}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="flex items-center gap-1 px-2.5 py-1.5 text-[12px] font-medium rounded-lg
            text-gray-400 hover:text-gray-600 hover:bg-gray-50
            disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-gray-400
            transition-all duration-200"
        >
          下一页
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </div>
    </div>
  );
}
