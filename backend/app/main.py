from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.routes import documents, chat, collections, models, game, status, perf, agent, portfolio, eval, visualize, workflow, multi_agent
from app.config import settings
from app.services.rate_limiter import check_and_increment

_RATE_LIMITED_PATHS = {
    "/api/v1/chat",
    "/api/v1/agent",
    "/api/v1/eval/run",
    "/api/v1/portfolio/parse",
    "/api/v1/game/start",
    "/api/v1/game/suggest-subtopics",
    "/api/v1/game/answer",
    "/api/v1/visualize/context",
    "/api/v1/workflow/run",
    "/api/v1/multi-agent/run",
}

app = FastAPI(
    title="Enterprise RAG Assistant",
    description="Document-grounded Q&A powered by Ollama + ChromaDB",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "https://rag-assistant-pro.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def api_key_guard(request: Request, call_next):
    # Allow CORS preflight requests through — CORS middleware handles them
    if request.method == "OPTIONS":
        return await call_next(request)

    if request.url.path in ("/", "/health", "/docs", "/openapi.json", "/redoc"):
        return await call_next(request)

    key = request.headers.get("X-API-Key")
    if key != settings.api_key:
        return JSONResponse(status_code=401, content={"detail": "Invalid or missing API key"})

    if request.url.path in _RATE_LIMITED_PATHS:
        user_id = request.headers.get("X-User-ID", "anonymous")
        allowed, count = check_and_increment(user_id)
        if not allowed:
            return JSONResponse(
                status_code=429,
                content={"detail": f"Daily limit of 100 requests reached. Resets at midnight. Used: {count}"},
            )

    return await call_next(request)


app.include_router(documents.router, prefix="/api/v1")
app.include_router(chat.router, prefix="/api/v1")
app.include_router(collections.router, prefix="/api/v1")
app.include_router(models.router, prefix="/api/v1")
app.include_router(game.router, prefix="/api/v1")
app.include_router(status.router, prefix="/api/v1")
app.include_router(perf.router, prefix="/api/v1")
app.include_router(agent.router, prefix="/api/v1")
app.include_router(portfolio.router, prefix="/api/v1")
app.include_router(eval.router, prefix="/api/v1")
app.include_router(visualize.router, prefix="/api/v1")
app.include_router(workflow.router, prefix="/api/v1")
app.include_router(multi_agent.router, prefix="/api/v1")


@app.get("/")
def root():
    return {"service": "Enterprise RAG Assistant", "status": "running"}


@app.get("/health")
def health():
    return {"status": "healthy", "model": settings.ollama_model}
