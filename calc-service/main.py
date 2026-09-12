from fastapi import FastAPI

import price_zones

app = FastAPI()

app.include_router(price_zones.router)


@app.get("/")
@app.get("/healthz")
def health():
    return {"status": "ok"}
