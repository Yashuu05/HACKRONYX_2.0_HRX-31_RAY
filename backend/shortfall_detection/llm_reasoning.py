import os
import sys
from typing import Dict, Any, Optional, List
from pydantic import BaseModel, Field
from langchain.chat_models import init_chat_model
from langchain_core.messages import HumanMessage, SystemMessage

project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from backend.utils import utilities


class LLMShortfallAnalysisSchema(BaseModel):
    summary_narrative: str = Field(description="2-sentence natural language summary explaining why shortfall is predicted and its impact.")
    actionable_bullets: List[str] = Field(description="List of 2-3 concise, actionable financial mitigation steps for the user.")
    ai_model_used: str = Field(description="Name of the LLM model that generated this analysis.")


class LLMShortfallReasoner:

    def __init__(self):
        self.config_path = os.path.join(project_root, "backend", "model_config.yaml")

    def load_model_configs(self) -> List[Dict[str, Any]]:
        utils = utilities()
        configs = []
        if os.path.exists(self.config_path):
            data = utils.read_yaml_file(file_path=self.config_path)
            if data and isinstance(data, dict):
                # Priority 1: Default Model (e.g. gpt-oss-20b / groq)
                if "text_model" in data and "default_model" in data["text_model"]:
                    configs.append(data["text_model"]["default_model"])
                # Priority 2: Backup Model (e.g. gemini-3.5-flash / google)
                if "text_model" in data and "backup_model" in data["text_model"]:
                    configs.append(data["text_model"]["backup_model"])
                # Priority 3: Open Source (e.g. qwen3:0.6b / ollama)
                if "open_source" in data:
                    configs.append(data["open_source"])
        return configs

    def create_model_instance(self, model_name: str, provider: str):
        prov = provider.lower().strip()
        if prov in ["google", "google_genai"]:
            from langchain_google_genai import ChatGoogleGenerativeAI
            gemini_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
            return ChatGoogleGenerativeAI(
                model=model_name,
                google_api_key=gemini_key,
                temperature=0.3,
                max_retries=0,
                request_timeout=3
            )
        elif prov == "groq":
            from langchain_groq import ChatGroq
            return ChatGroq(
                model=model_name,
                groq_api_key=os.getenv("GROQ_API_KEY"),
                temperature=0.3,
                max_retries=1,
                request_timeout=6
            )
        else:
            # Fallback for open-source / local models
            model = init_chat_model(
                model=model_name,
                model_provider=prov,
                temperature=0.3
            )
            return model

    def generate_llm_reasoning(self, shortfall_payload: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Executes LLM reasoning based on shortfall payload and model_config.yaml settings.
        Returns dict with summary_narrative, actionable_bullets, and ai_model_used.
        """
        if not shortfall_payload:
            return None

        configs = self.load_model_configs()

        system_prompt = SystemMessage(content="""
            You are SPECIFY, an elite personal finance and liquidity risk analyst.
            Your job is to analyze user cashflow telemetry and generate a clear, empathetic 2-sentence explanation of why a shortfall is predicted, followed by 2-3 specific, actionable mitigation steps.

            Guidelines:
            1. Keep the narrative concise (maximum 2 sentences). Include exact numbers (balance, deficit, days).
            2. Provide 2-3 specific action bullets (e.g., spending caps, bill deferrals).
            3. Maintain a professional, encouraging tone.
        """)

        user_content = f"""
        User Cashflow Telemetry:
        - Current Net Balance: ₹{shortfall_payload.get('current_balance', 0.0):,.2f}
        - Safety Buffer Threshold: ₹{shortfall_payload.get('safety_buffer', 3000.0):,.2f}
        - Shortfall Deficit: ₹{shortfall_payload.get('shortfall_deficit', 0.0):,.2f}
        - Days to Shortfall: {shortfall_payload.get('days_to_shortfall')} day(s) (Date: {shortfall_payload.get('shortfall_date')})
        - Weekly Budget: ₹{shortfall_payload.get('weekly_budget', 5000.0):,.2f}
        - Daily Burn Velocity: ₹{shortfall_payload.get('daily_burn_rate', 700.0):,.2f}/day
        - Primary Algorithmic Factors: {', '.join(shortfall_payload.get('identified_factors', []))}

        Generate shortfall reasoning and actionable mitigation steps.
        """
        user_message = HumanMessage(content=user_content)

        for cfg in configs:
            m_name = cfg.get("name")
            m_provider = cfg.get("provider")
            try:
                print(f"[LLM Shortfall Reasoner] Attempting model: {m_name} | provider: {m_provider}")
                model = self.create_model_instance(model_name=m_name, provider=m_provider)

                # Try structured output chain
                try:
                    structured_model = model.with_structured_output(LLMShortfallAnalysisSchema)
                    result = structured_model.invoke([system_prompt, user_message])
                    if isinstance(result, LLMShortfallAnalysisSchema):
                        res_dict = result.model_dump()
                        res_dict["ai_model_used"] = f"{m_name} ({m_provider})"
                        return res_dict
                except Exception as struct_err:
                    print(f"Structured output attempt note for {m_name}: {struct_err}")

                # String invocation fallback
                response = model.invoke([system_prompt, user_message])
                if response and hasattr(response, "content") and response.content:
                    lines = [line.strip("- *") for line in str(response.content).split("\n") if line.strip()]
                    narrative = lines[0] if lines else "Shortfall risk detected based on current spending rate."
                    bullets = lines[1:] if len(lines) > 1 else ["Cap discretionary daily spending.", "Review non-essential bills."]
                    return {
                        "summary_narrative": narrative,
                        "actionable_bullets": bullets[:3],
                        "ai_model_used": f"{m_name} ({m_provider})"
                    }

            except Exception as err:
                print(f"[LLM Shortfall Reasoner] Model {m_name} ({m_provider}) failed: {err}. Proceeding to fallback candidate.")
                continue

        return None
