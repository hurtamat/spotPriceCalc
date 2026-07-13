from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()   # <- this is the "app" fastapi dev looks for

class CalcRequest(BaseModel):
    prices: list[float]
    pool_size_m3: float
    target_temp_c: float

@app.get("/")
def health():
    return {"status": "ok"}

@app.post("/schedule")
def schedule(req: CalcRequest):
    return {"hours": []}