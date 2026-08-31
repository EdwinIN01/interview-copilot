from langchain_openai import ChatOpenAI
from app.config import settings


def get_llm(scenario: str = "default"):
    """根据场景选择 LLM"""
    api_key = settings.DEEPSEEK_API_KEY or settings.OPENAI_API_KEY
    base_url = settings.DEEPSEEK_BASE_URL if settings.DEEPSEEK_API_KEY else None

    if not api_key:
        # 没有 API key 时返回一个模拟 LLM（用于开发测试）
        return _MockLLM()

    temperature = 0.3 if scenario == "evaluate" else 0.7
    model = "deepseek-chat"

    return ChatOpenAI(
        model=model,
        api_key=api_key,
        base_url=base_url,
        temperature=temperature,
    )


class _MockLLM:
    """模拟 LLM，用于没有 API key 时的开发测试"""

    async def ainvoke(self, prompt, **kwargs):
        from langchain_core.messages import AIMessage
        content = self._mock_response(prompt)
        return AIMessage(content=content)

    async def astream(self, prompt, **kwargs):
        from langchain_core.messages import AIMessageChunk
        content = self._mock_response(prompt)
        # 模拟流式输出，每 3 个字一个 chunk
        for i in range(0, len(content), 3):
            yield AIMessageChunk(content=content[i:i+3])

    def _mock_response(self, prompt) -> str:
        p = str(prompt)
        # opening 节点：明确包含"请完成开场"或"opening"，且不包含"请生成"（避免误判）
        if ("请完成开场" in p or "开场：" in p or "opening" in p.lower()) and "请生成一个" not in p:
            return "你好！我是今天的面试官，很高兴见到你。我们今天的面试大约30分钟，主要考察你的技术基础和项目经验。首先，请你做一个1分钟的自我介绍。"
        # evaluate 节点：明确包含评分请求
        if "请对候选人的回答进行评分" in p or "评分维度" in p or "evaluate" in p.lower():
            import json
            return json.dumps({
                "tech_depth": 7.0, "expression": 8.0, "adaptability": 7.5,
                "foundation": 8.0, "comment": "回答结构清晰，基础知识扎实，但技术深度可以进一步加强。",
                "suggested_answer": "一个较好的回答应该包含原理、实践经验和具体案例，先讲核心概念，再结合项目说明应用场景，最后总结优缺点。",
                "weak_points": ["技术深度可以加强", "可以多举具体案例"]
            }, ensure_ascii=False)
        # followup 节点：明确包含追问请求
        if "请针对最关键的一个薄弱点进行追问" in p or "followup" in p.lower():
            return "你刚才提到了相关技术，能具体说说在实际项目中是怎么应用的吗？遇到过什么技术难点，是怎么解决的？"
        # summary 节点：明确包含整体评价请求
        if "请给出整体评价" in p or "面试已结束" in p or "summary" in p.lower():
            import json
            return json.dumps({
                "overall_comment": "整体表现良好，基础知识扎实，表达清晰，建议在技术深度和项目细节上继续加强，多准备一些具体的技术案例。",
                "suggestions": ["深入学习分布式系统原理，准备系统设计题", "准备3个项目的STAR法则描述，突出技术难点和解决方案", "多进行模拟面试练习，提升应变能力"]
            }, ensure_ascii=False)
        # question 节点：默认返回技术面试题
        questions = [
            "请介绍一下你最熟悉的一个项目，你在其中承担了什么角色，遇到了哪些技术挑战？",
            "请解释一下你简历中提到的某项核心技术的原理，以及它的应用场景和优缺点。",
            "如果让你设计一个高并发、低延迟的系统，你会从哪些方面考虑架构设计？",
            "请说说你在项目中遇到的最大技术挑战，以及你是如何分析和解决的。",
            "你了解过哪些最新的技术趋势？请结合你的理解谈谈它的应用前景。",
            "请描述一下你平时是如何学习新技术的，举一个你快速上手新技术的例子。",
        ]
        import random
        return random.choice(questions)
