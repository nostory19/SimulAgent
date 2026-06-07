'use client';

export default function GlossaryPage() {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-gray-800">术语库</h2>
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="text-center py-12">
          <p className="text-4xl mb-3">📚</p>
          <p className="text-gray-500 text-sm">术语增强功能即将上线</p>
          <p className="text-gray-400 text-xs mt-1">支持上传 PPT/PDF/Word 自动提取专业术语</p>
        </div>
      </div>
    </div>
  );
}
