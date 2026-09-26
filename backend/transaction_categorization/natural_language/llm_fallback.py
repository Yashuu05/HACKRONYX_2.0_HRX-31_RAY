from langchain.chat_models import init_chat_model
from langchain_core.messages import HumanMessage, SystemMessage
from langchain.agents import create_agent
from pydantic import BaseModel, Field
import os 
import sys

project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
if project_root not in sys.path:
    sys.path.insert(0, project_root)
from backend.utils import utilities


class TransactionInfo(BaseModel):
    transaction_type: str = Field(description="type of transaction either expense or income")
    amount: float = Field(description="amount of expenditure or income")
    category: str = Field(description="the category of expenditure or income")
    description: str = Field(description="description given by user")
    transaction_method: str = Field(description="payment method used by person")


class FallBackLLM:

    def define_system_prompt(self):
        system_prompt = SystemMessage(content="""
            You are a Personal Finance Assistant.
            Your responsibility is to extract the required words from given natural language financial entry or statement.
            EXAMPLE:
            1. sentence: I spent INR 340 on burger via UPI
            OUTPUT:
            transaction_type: expense
            amount: 340
            description: meal
            category: food and beverages
            transaction_method: UPI
            
            2. sentence: INR 3000 stipend via cheque
            OUTPUT:
            transaction_type: income
            amount: 3000
            description: stipend
            category: stipend
            transaction_method: cheque

            IMPORTANT:
            1. the "transaction_type" must be either "expense" or "income"
            2. Payment Methods:
                - upi
                - credit_card
                - debit_card
                - cash
                - cheque
                - bank_transfer
            3. expense category:
                - food and beverages (burger, pizza, meal etc.)
                - travel (trip, bus, car, cab, taxi etc.)
                - clothing (t-shirts, shirts, trousers etc.)
                - academic (books, notebooks, files etc.)
                - entertainment (movie, cinema etc.)
                - healthcare (medicines, hospital bill etc.)
                - utilities ()
                - rent
                - subscriptions (netflix, amazon prime, wifi, app etc.)
                - personal care (haircut, massage, etc.)
                - gifts 
                - other
            4. Income Categories:
                - salary
                - stipend
                - family transfer
                - friend transfer
                - rewards
                - business income
                - freelance
                - refund
                - passive income
                - other

            NOTE: strictly follow given categories and schema. Do not create new category.
            NOTE: if given requirement is inefficient, assume appropriate value otherwise null.
        """)
        return system_prompt

    def create_agent(self, model, system_prompt):
        """
        - purpose: defines agent object
        - inputs:
            1. model: a model object
            2. system_prompt: system instruction message
        - returns:
            agent object or None if agent creation fails
        """
        try:
            agent = create_agent(
                model=model,
                tools=[],
                system_prompt=system_prompt,
                response_format=TransactionInfo
            )
            return agent
        except Exception as e:
            return None
    
    def create_model(self, model_name: str, provider: str):
        """
        - purpose: defines LLM for an agent
        - inputs:
            1. model_name: name of model to use.
            2. provider: model provider
        - output: None
        - returns: model object
        """
        provider_map = {
            "google": "google_genai",
        }
        actual_provider = provider_map.get(provider.lower(), provider)
        model = init_chat_model(
            model=model_name,
            model_provider=actual_provider,
            temperature=0.5
        )
        return model

    def run_agent(self, model, system_prompt, text: str):
        """
        - purpose: run the agent and extract transaction info
        - inputs:
            1. model: LLM model object
            2. system_prompt: SystemMessage object
            3. text: user input text
        - output: parsed transaction dictionary
        - returns: dict or None
        """
        user_message = HumanMessage(content=f"categorize given financial entry.\n{text}")
        
        # 1. Try agent.invoke via create_agent
        agent = self.create_agent(model=model, system_prompt=system_prompt)
        if agent is not None:
            try:
                result = agent.invoke({"messages": [user_message]})
                if isinstance(result, dict) and "structured_response" in result:
                    structured = result["structured_response"]
                    if isinstance(structured, TransactionInfo):
                        return structured.model_dump()
                    elif isinstance(structured, dict):
                        return structured
            except Exception as e:
                print(f"Agent execution encountered issue ({e}). Falling back to structured output chain...")

        # 2. Resilient fallback using model.with_structured_output
        try:
            structured_model = model.with_structured_output(TransactionInfo)
            result = structured_model.invoke([system_prompt, user_message])
            if isinstance(result, TransactionInfo):
                return result.model_dump()
            elif isinstance(result, dict):
                return result
        except Exception as e:
            print(f"Structured output fallback error: {e}")
            return None

    def llm_fallback_pipeline(self, user_text: str = ""):
        """
        - purpose: main pipeline to attempt fallback categorization using LLM
        - inputs: user_text (natural language entry)
        - returns: extracted transaction info dict or None
        """
        CONFIG_FILE_PATH = os.path.join(project_root, "backend", "model_config.yaml")
        utils = utilities()
        try:
            print("**** LLM Fallback Initiated *****") 
            if os.path.exists(CONFIG_FILE_PATH):
                print(f"reading {CONFIG_FILE_PATH} file...")
                data = utils.read_yaml_file(file_path=CONFIG_FILE_PATH)
                if data and isinstance(data, dict):
                    print(f"{CONFIG_FILE_PATH} successfully read.")
                    
                    configs_to_try = []
                    if "open_source" in data:
                        configs_to_try.append(data["open_source"])
                    if "text_model" in data and "default_model" in data["text_model"]:
                        configs_to_try.append(data["text_model"]["default_model"])
                    if "text_model" in data and "backup_model" in data["text_model"]:
                        configs_to_try.append(data["text_model"]["backup_model"])

                    for cfg in configs_to_try:
                        model_name = cfg.get("name")
                        model_provider = cfg.get("provider")
                        print(f"Attempting model: {model_name} | provider: {model_provider}")
                        try:
                            model = self.create_model(model_name=model_name, provider=model_provider)
                            sys_prompt = self.define_system_prompt()
                            result = self.run_agent(model=model, system_prompt=sys_prompt, text=user_text)
                            if result:
                                print(f"Successfully categorized transaction with model {model_name}: {result}")
                                return result
                        except Exception as err:
                            print(f"Attempt failed for model {model_name} ({model_provider}): {err}")
                            continue
                else:
                    print("Could not parse model_config.yaml file.")
            else:
                print("model_config.yaml not found.")
        except Exception as e:
            print(f"Fallback pipeline error: {e}")
        return None


if __name__ == "__main__":
    user_text = "INR 30000 salary via cheque"
    fallback = FallBackLLM()
    result = fallback.llm_fallback_pipeline(user_text=user_text)
    print("Final Extracted Result:", result)
