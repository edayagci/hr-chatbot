import os
from openai import OpenAI
import pandas as pd
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware


# === Initialize OpenAI client ===
client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])  # <-- from env


# === Load embedded data ===
df = pd.read_pickle("./embedded_df.pkl")

# === FastAPI setup ===
app = FastAPI()

# === CORS for frontend communication ===
app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("ALLOW_ORIGIN", "http://localhost:3000")],  # local UI for now
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    return {"ok": True}


# === Embedding function ===
def get_query_embedding(text: str) -> list[float]:
    response = client.embeddings.create(
        input=[text],
        model="text-embedding-3-small"
    )
    return response.data[0].embedding

# === Semantic search ===
def search_top_chunks(query: str, df: pd.DataFrame, top_k: int = 3) -> pd.DataFrame:
    query_vector = get_query_embedding(query)
    similarities = df["embedding"].apply(lambda emb: cosine_similarity([query_vector], [emb])[0][0])
    df_with_scores = df.copy()
    df_with_scores["similarity"] = similarities
    return df_with_scores.sort_values("similarity", ascending=False).head(top_k)

# === ChatGPT wrapper ===
def ask_gpt(query: str, top_chunks_df: pd.DataFrame) -> str:
    context = "\n\n---\n\n".join(top_chunks_df["chunk"])
    prompt = (
        "You are a helpful assistant. Use only the context below to answer the question. "
        "Include specific details if relevant.\n\n"
        f"Context:\n{context}\n\nQuestion: {query}\nAnswer:"
    )

    response = client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[
            {"role": "user", "content": prompt}
        ],
        temperature=0.3
    )
    return response.choices[0].message.content.strip()

# === Main Chat Endpoint ===
@app.post("/chat")
async def chat_endpoint(request: Request):
    data = await request.json()
    query = data.get("question")

    if not query:
        return {"error": "No question provided."}

    try:
        top_chunks = search_top_chunks(query, df, top_k=3)
        answer = ask_gpt(query, top_chunks)
        links = top_chunks[["file_title", "attachment_url"]].to_dict("records")

        return {
            "answer": answer,
            "links": links
        }
    except Exception as e:
        return {"error": str(e)}
