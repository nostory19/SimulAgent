"""
Revision Agent 节点（动态修正）。

当后续上下文揭示更完整的语义时，检测并修正之前的翻译结果。
通过百炼 API 对比新旧上下文，判断是否需要修正并重新翻译。
"""
import os
from openai import AsyncOpenAI

REVISION_PROMPT = """You are a translation editor. Given an earlier translation that may have been based on incomplete context, revise it using the new clarifying information.

Original English: {original}
Earlier translation (based on partial context): {old_translation}
New context now available: {new_context}

Instructions:
- If the earlier translation is still accurate given the new context, reply EXACTLY "NO_REVISION_NEEDED"
- If the earlier translation should be revised, provide ONLY the revised Chinese translation
- The revised translation should incorporate the new context naturally
- Do not add explanations or notes"""


def _get_client():
    api_key = os.getenv("BAILIAN_API_KEY", "")
    base_url = os.getenv("BAILIAN_BASE_URL", "https://dashscope.aliyuncs.com/compatible-mode/v1")
    return AsyncOpenAI(api_key=api_key, base_url=base_url)


async def check_and_revise(
    original_text: str,
    old_translation: str,
    new_context: str,
    model: str | None = None,
) -> str | None:
    """
    检查是否需要修正之前的翻译，如果需要则返回修正后的文本。

    Args:
        original_text: 原始英文文本。
        old_translation: 之前的中文翻译。
        new_context: 新的上下文信息（后续文本）。

    Returns:
        修正后的中文翻译，如果不需要修正则返回 None。
    """
    if not original_text or not new_context:
        return None

    client = _get_client()
    model_name = model or os.getenv("BAILIAN_MODEL", "qwen3-8b")

    prompt = REVISION_PROMPT.format(
        original=original_text,
        old_translation=old_translation,
        new_context=new_context,
    )

    try:
        response = await client.chat.completions.create(
            model=model_name,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
            max_tokens=500,
            extra_body={"enable_thinking": False},
        )
        result = response.choices[0].message.content.strip()

        if result and result != "NO_REVISION_NEEDED":
            return result
        return None
    except Exception as e:
        print(f"[revision] error: {e}")
        return None
