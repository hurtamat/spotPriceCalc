from fastapi import FastAPI

import price_zones

app = FastAPI()

app.include_router(price_zones.router)


@app.get("/")
def health():
    return {"status": "ok"}
