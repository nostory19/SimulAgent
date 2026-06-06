"""
Translation Agent 节点（LangGraph）。

调用阿里云百炼 API（OpenAI 兼容）进行实时翻译，
支持流式 token-by-token 输出，翻译结果通过 stream writer 实时推送。
"""
import os
from typing import Any
from openai import AsyncOpenAI
from langgraph.config import get_stream_writer
from .graph import PipelineState


def _get_client() -> AsyncOpenAI:
    """创建百炼 API 客户端（OpenAI 兼容模式）。"""
    api_key = os.getenv("BAILIAN_API_KEY", "")
    base_url = os.getenv("BAILIAN_BASE_URL", "https://dashscope.aliyuncs.com/compatible-mode/v1")
    return AsyncOpenAI(api_key=api_key, base_url=base_url)


# 翻译系统提示词
SYSTEM_PROMPT = """You are a professional simultaneous interpreter translating from English to Simplified Chinese.
Rules:
- Produce only the Chinese translation. Do not add explanations, notes, or the original English.
- Use natural, fluent Chinese that sounds like a native speaker, not a literal word-for-word translation.
- Maintain consistency with previous translations in the context window.
- Preserve proper nouns, product names, and technical acronyms in their original form.
- If a phrase is ambiguous, render the most natural interpretation.
- Keep the translation concise — match the original sentence length."""


async def translation_node(state: PipelineState) -> dict[str, Any]:
    """
    翻译节点。

    从 state 读取 ASR 文本和上下文窗口，调用百炼大模型进行英→中翻译。
    通过 stream writer 实时推送每个 token。

    Args:
        state: 流水线共享状态，需包含 asr_full_text 和 context_window。

    Returns:
        更新后的状态字典，包含 translation 和翻译历史。
    """
    writer = get_stream_writer()
    client = _get_client()

    asr_text: str = state.get("asr_full_text", "").strip()
    context: list = state.get("context_window", [])
    model: str = os.getenv("BAILIAN_MODEL", "qwen3-8b")

    # 没有文本待翻译则跳过
    if not asr_text:
        return {}

    # 构建消息：system prompt + 上下文历史
    messages: list[dict] = [{"role": "system", "content": SYSTEM_PROMPT}]

    # 将最近翻译上下文作为 assistant/user 对话历史注入
    if context:
        context_text = "\n".join(context[-5:])  # 最多5条上下文
        messages.append({
            "role": "user",
            "content": f"Previous translations (for consistency):\n{context_text}"
        })
        messages.append({"role": "assistant", "content": "Understood. I'll maintain consistency."})

    # 当前待翻译文本
    messages.append({"role": "user", "content": f"Translate: {asr_text}"})

    # 调用百炼 API 流式翻译
    translated_parts: list[str] = []
    try:
        stream = await client.chat.completions.create(
            model=model,
            messages=messages,
            stream=True,
            temperature=0.3,  # 低温度提升一致性
            max_tokens=500,
        )
        async for chunk in stream:
            delta = chunk.choices[0].delta
            if delta.content:
                translated_parts.append(delta.content)
                # 逐 token 推送翻译进度
                writer({
                    "event": "translation:token",
                    "token": delta.content,
                })

    except Exception as e:
        writer({"event": "error", "message": f"Translation failed: {str(e)}"})
        return {"translation": asr_text}  # fallback: 原文

    full_translation = "".join(translated_parts)

    # 更新翻译历史
    history = list(state.get("translation_history", []))
    history.append({"source": asr_text, "target": full_translation})

    return {
        "translation": full_translation,
        "translation_history": history,
    }
