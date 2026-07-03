import google.generativeai as genai
import os
from dotenv import load_dotenv

load_dotenv()
genai.configure(api_key=os.environ["GEMINI_API_KEY"])

model = os.environ.get("GEMINI_EMBEDDING_MODEL", "models/gemini-embedding-001")
try:
    res = genai.embed_content(model=model, content="test", output_dimensionality=768)
    print(f"Model {model} dimension with output_dimensionality=768: {len(res['embedding'])}")
except Exception as e:
    print(f"Error: {e}")
