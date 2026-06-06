"""
AI 会议总结 Agent——基于百炼 API 生成结构化总结。

输入：整场会话的完整转录文本
输出：摘要、核心观点、术语表、行动项
"""
import json
import os
from openai import AsyncOpenAI

SUMMARY_PROMPT = """You are a professional meeting summarizer. Based on the transcript below, generate a structured summary in Chinese.

Transcript:
{transcript}

Return ONLY valid JSON with this structure (no markdown, no code blocks):
{{
  "abstract": "一段200字以内的摘要概述",
  "key_viewpoints": ["核心观点1", "核心观点2", "核心观点3"],
  "term_glossary": [
    {{"term": "English term 1", "translation": "中文翻译1", "context": "在什么语境下出现"}}
  ],
  "action_items": [
    {{"item": "待办/行动项", "priority": "high/medium/low"}}
  ]
}}

Rules:
- abstract must be concise, 100-200 Chinese characters
- key_viewpoints: 3-5 main viewpoints or topics discussed
- term_glossary: only important domain-specific terms (3-8 items max)
- action_items: only actionable takeaways mentioned or implied (0-4 items)
- All field values in Chinese, except the "term" field in term_glossary which should be English
- If a section has no content, use an empty array []"""


async def generate_summary(transcript: str, model: str | None = None) -> dict:
    """
    调用百炼 API 生成结构化总结。

    Args:
        transcript: 全文转录文本（英文+中文均可）。
        model: 百炼模型名，默认从 BAILIAN_MODEL 环境变量读取。

    Returns:
        {abstract, key_viewpoints, term_glossary, action_items}
    """
    if not transcript or len(transcript) < 30:
        return {
            "abstract": "转录文本太短，无法生成有效总结",
            "key_viewpoints": [],
            "term_glossary": [],
            "action_items": [],
        }

    api_key = os.getenv("BAILIAN_API_KEY", "")
    base_url = os.getenv("BAILIAN_BASE_URL", "https://dashscope.aliyuncs.com/compatible-mode/v1")
    client = AsyncOpenAI(api_key=api_key, base_url=base_url)
    model_name = model or os.getenv("BAILIAN_MODEL", "qwen3-8b")

    # 截断过长文本
    max_chars = 8000
    if len(transcript) > max_chars:
        transcript = transcript[:max_chars] + "\n...(truncated)"

    try:
        response = await client.chat.completions.create(
            model=model_name,
            messages=[{"role": "user", "content": SUMMARY_PROMPT.format(transcript=transcript)}],
            temperature=0.3,
            max_tokens=1500,
            extra_body={"enable_thinking": False},
        )

        content = response.choices[0].message.content.strip()
        # 尝试去掉可能的 markdown 代码块包裹
        if content.startswith("```"):
            content = content.split("\n", 1)[-1]
            if content.endswith("```"):
                content = content[:-3]
        result = json.loads(content)
        return result
    except (json.JSONDecodeError, Exception) as e:
        print(f"[summary] error: {e}")
        return {
            "abstract": f"总结生成失败: {str(e)[:100]}",
            "key_viewpoints": [],
            "term_glossary": [],
            "action_items": [],
        }
